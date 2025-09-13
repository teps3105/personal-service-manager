import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import {
  CreateNotificationRequest,
  UpdateNotificationRequest,
  Notification,
  NotificationStats,
  NtfyConfig
} from '../types';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Middleware to verify JWT token
const authenticateToken = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Send notification via ntfy.sh
router.post('/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { service_id, title, message, priority = 'medium', config = {} }: CreateNotificationRequest = req.body;

    if (!service_id || !title || !message) {
      return res.status(400).json({ 
        error: 'Service ID, title, and message are required' 
      });
    }

    // Verify service exists and belongs to user
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .eq('user_id', req.user.userId)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ 
        error: 'Service not found or access denied' 
      });
    }

    // Get ntfy configuration from database or use defaults
    let ntfyConfig: NtfyConfig;

    try {
      const { data: configs } = await supabase
        .from('ntfy_configs')
        .select('*')
        .eq('user_id', req.user.userId)
        .single();

      if (configs) {
        ntfyConfig = configs.config;
      } else {
        // Create default config for user
        const defaultConfig: NtfyConfig = {
          url: process.env.NTFY_URL || 'https://ntfy.sh',
          topic: process.env.NTFY_TOPIC || 'personal-service-manager',
          defaultPriority: priority,
          rateLimit: 60, // requests per minute
          timeout: 30000 // 30 seconds
        };

        const { data: newConfig } = await supabase
          .from('ntfy_configs')
          .insert([{
            user_id: req.user.userId,
            config: defaultConfig,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        ntfyConfig = newConfig.config;
      }
    } catch (configError) {
      console.error('Failed to get/create ntfy config:', configError);
      return res.status(500).json({ 
        error: 'Failed to configure notification service' 
      });
    }

    // Prepare notification data
    const notificationPayload = {
      title,
      message,
      priority,
      metadata: {
        service_id,
        service_name: service.name,
        service_type: service.type,
        user_id: req.user.userId,
        timestamp: new Date().toISOString(),
        config
      }
    };

    // Send notification via ntfy.sh
    let notificationResult;
    try {
      const ntfyUrl = ntfyConfig.url;
      const ntfyTopic = ntfyConfig.topic;
      const ntfyPriority = config.priority || ntfyConfig.defaultPriority;
      
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add authentication if ntfy server requires it
      if (ntfyConfig.username && ntfyConfig.password) {
        const authString = Buffer.from(`${ntfyConfig.username}:${ntfyConfig.password}`).toString('base64');
        headers.Authorization = `Basic ${authString}`;
      }

      const response = await axios.post(`${ntfyUrl}/${ntfyyTopic}`, {
        title,
        message,
        priority: ntfyPriority === 'high' ? '5' : ntfyPriority === 'medium' ? '3' : '1',
        tags: `service-${service_id},priority-${ntfyPriority}`,
        click: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/services/${service_id}`
      }, { headers, timeout: ntfyConfig.timeout });

      notificationResult = {
        status: 'success',
        provider: 'ntfy.sh',
        response: response.data,
        delivered: true
      };
    } catch (ntfyError: any) {
      console.error('Ntfy.sh notification failed:', ntfyError);
      notificationResult = {
        status: 'failed',
        provider: 'ntfy.sh',
        error: ntfyError.message || 'Failed to send notification',
        delivered: false
      };
    }

    // Store notification in database
    const notificationData = {
      user_id: req.user.userId,
      service_id,
      title,
      message,
      priority,
      provider: 'ntfy.sh',
      status: notificationResult.status,
      response_data: notificationResult.response,
      error_message: notificationResult.status === 'failed' ? notificationResult.error : null,
      metadata: notificationPayload.metadata,
      created_at: new Date().toISOString()
    };

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (notificationError) {
      console.error('Failed to store notification:', notificationError);
      return res.status(500).json({ 
        error: 'Failed to store notification' 
      });
    }

    // If notification is related to service status change, update service last_notification
    if (message.includes('status changed') || message.includes('service is now')) {
      const { error: updateError } = await supabase
        .from('services')
        .update({ 
          last_notification: new Date().toISOString()
        })
        .eq('id', service_id)
        .eq('user_id', req.user.userId);

      if (updateError) {
        console.error('Failed to update service last notification time:', updateError);
      }
    }

    res.json({
      message: 'Notification sent successfully',
      notification: {
        id: notification.id,
        title,
        message,
        priority,
        status: notificationResult.status,
        provider: notificationResult.provider
      }
    });
  } catch (error: any) {
    console.error('Send notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all notifications for user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0', status, priority, service_id } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (service_id) {
      query = query.eq('service_id', service_id);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch notifications',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.json(notifications || []);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get a single notification by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (error) {
      console.error('Get notification error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch notification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error: any) {
    console.error('Get notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create a new notification
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      service_id, 
      title, 
      message, 
      priority = 'medium',
      metadata = {} 
    }: CreateNotificationRequest = req.body;

    if (!service_id || !title || !message) {
      return res.status(400).json({ 
        error: 'Service ID, title, and message are required' 
      });
    }

    // Verify service exists and belongs to user
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .eq('user_id', req.user.userId)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ 
        error: 'Service not found or access denied' 
      });
    }

    const notificationData = {
      user_id: req.user.userId,
      service_id,
      title,
      message,
      priority,
      provider: 'manual',
      status: 'pending',
      metadata: {
        ...metadata,
        service_name: service.name,
        service_type: service.type,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (notificationError) {
      console.error('Create notification error:', notificationError);
      return res.status(500).json({ 
        error: 'Failed to create notification' 
      });
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error: any) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update a notification
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateNotificationRequest = req.body;

    // Verify notification exists and belongs to user
    const { data: existingNotification, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updatePayload = {
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.message && { message: updateData.message }),
      ...(updateData.priority && { priority: updateData.priority }),
      ...(updateData.status && { status: updateData.status }),
      ...(updateData.metadata && { metadata: updateData.metadata }),
      updated_at: new Date().toISOString()
    };

    const { data: notification, error: updateError } = await supabase
      .from('notifications')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update notification error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update notification' 
      });
    }

    res.json({
      message: 'Notification updated successfully',
      notification
    });
  } catch (error: any) {
    console.error('Update notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete a notification
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify notification exists and belongs to user
    const { data: existingNotification, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete notification error:', error);
      return res.status(500).json({ 
        error: 'Failed to delete notification' 
      });
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get total notifications count
    const { data: notifications, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.userId);

    if (countError) {
      console.error('Get notification stats error:', countError);
      return res.status(500).json({ 
        error: 'Failed to fetch notification statistics',
        details: process.env.NODE_ENV === 'development' ? countError.message : undefined
      });
    }

    // Get notifications by status
    const { data: statusData } = await supabase.rpc('get_notifications_by_status', {
      p_user_id: req.user.userId
    });

    // Get notifications by priority
    const { data: priorityData } = await supabase.rpc('get_notifications_by_priority', {
      p_user_id: req.user.userId
    });

    // Get notifications by service
    const { data: serviceData } = await supabase.rpc('get_notifications_by_service', {
      p_user_id: req.user.userId
    });

    const stats = {
      total: notifications[0]?.count || 0,
      unread: statusData?.find((item: any) => item.status === 'unread')?.count || 0,
      read: statusData?.find((item: any) => item.status === 'read')?.count || 0,
      pending: statusData?.find((item: any) => item.status === 'pending')?.count || 0,
      sent: statusData?.find((item: any) => item.status === 'sent')?.count || 0,
      failed: statusData?.find((item: any) => item.status === 'failed')?.count || 0,
      high_priority: priorityData?.find((item: any) => item.priority === 'high')?.count || 0,
      medium_priority: priorityData?.find((item: any) => item.priority === 'medium')?.count || 0,
      low_priority: priorityData?.find((item: any) => item.priority === 'low')?.count || 0,
      by_service: serviceData?.reduce((acc: Record<string, number>, item: any) => {
        acc[item.service_name || 'unknown'] = (acc[item.service_name || 'unknown'] || 0) + item.count;
        return acc;
      }, {}) || {}
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify notification exists and belongs to user
    const { data: existingNotification, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Mark notification as read error:', error);
      return res.status(500).json({ 
        error: 'Failed to mark notification as read' 
      });
    }

    res.json({
      message: 'Notification marked as read successfully'
    });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('user_id', req.user.userId)
      .eq('status', 'unread');

    if (error) {
      console.error('Mark all notifications as read error:', error);
      return res.status(500).json({ 
        error: 'Failed to mark all notifications as read' 
      });
    }

    res.json({
      message: 'All notifications marked as read successfully'
    });
  } catch (error: any) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;