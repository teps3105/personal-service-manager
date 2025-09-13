import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import {
  CreateServiceRequest,
  UpdateServiceRequest,
  Service,
  ServiceStats,
  MonitoringLog
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

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get all services for a user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get services error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch services',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.json(services || []);
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get a single service by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (error) {
      console.error('Get service error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch service',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error: any) {
    console.error('Get service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create a new service
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      type = 'general',
      status = 'active', 
      priority = 'medium',
      config = {},
      metadata = {},
      tags = []
    }: CreateServiceRequest = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const serviceData = {
      user_id: req.user.userId,
      name,
      description: description || null,
      type,
      status,
      priority,
      config,
      metadata,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: service, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (error) {
      console.error('Create service error:', error);
      return res.status(500).json({ 
        error: 'Failed to create service',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error: any) {
    console.error('Create service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update a service
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateServiceRequest = req.body;

    // Verify service belongs to user
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const updatePayload = {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.type && { type: updateData.type }),
      ...(updateData.status && { status: updateData.status }),
      ...(updateData.priority && { priority: updateData.priority }),
      ...(updateData.config && { config: updateData.config }),
      ...(updateData.metadata && { metadata: updateData.metadata }),
      ...(updateData.tags && { tags: updateData.tags }),
      updated_at: new Date().toISOString()
    };

    const { data: service, error } = await supabase
      .from('services')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update service error:', error);
      return res.status(500).json({ 
        error: 'Failed to update service',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error: any) {
    console.error('Update service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete a service
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify service belongs to user
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete service error:', error);
      return res.status(500).json({ 
        error: 'Failed to delete service',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.json({
      message: 'Service deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get service statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get total services count
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.userId);

    if (servicesError) {
      console.error('Get services stats error:', servicesError);
      return res.status(500).json({ 
        error: 'Failed to fetch service statistics',
        details: process.env.NODE_ENV === 'development' ? servicesError.message : undefined
      });
    }

    // Get services by status
    const { data: statusData } = await supabase.rpc('get_services_by_status', {
      p_user_id: req.user.userId
    });

    // Get services by type
    const { data: typeData } = await supabase.rpc('get_services_by_type', {
      p_user_id: req.user.userId
    });

    const stats: ServiceStats = {
      total: services[0]?.count || 0,
      active: statusData?.find((item: any) => item.status === 'active')?.count || 0,
      inactive: statusData?.find((item: any) => item.status === 'inactive')?.count || 0,
      completed: statusData?.find((item: any) => item.status === 'completed')?.count || 0,
      high_priority: services[0]?.count || 0, // This will be updated with actual query
      medium_priority: services[0]?.count || 0, // This will be updated with actual query
      low_priority: services[0]?.count || 0, // This will be updated with actual query
      by_type: typeData?.reduce((acc: Record<string, number>, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + item.count;
        return acc;
      }, {}) || {}
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Get service stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get monitoring logs for a service
router.get('/:id/logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Verify service belongs to user
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { data: logs, error } = await supabase
      .from('monitoring_logs')
      .select('*')
      .eq('service_id', id)
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(limit));

    if (error) {
      console.error('Get monitoring logs error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch monitoring logs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.json(logs || []);
  } catch (error: any) {
    console.error('Get monitoring logs error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add monitoring log entry
router.post('/:id/logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, response_time, error_message, metadata = {} } = req.body;

    // Verify service belongs to user
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (checkError || !existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const logData = {
      service_id: id,
      timestamp: new Date().toISOString(),
      status,
      response_time: response_time || null,
      error_message: error_message || null,
      metadata
    };

    const { data: log, error } = await supabase
      .from('monitoring_logs')
      .insert([logData])
      .select()
      .single();

    if (error) {
      console.error('Create monitoring log error:', error);
      return res.status(500).json({ 
        error: 'Failed to create monitoring log',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(201).json({
      message: 'Monitoring log created successfully',
      log
    });
  } catch (error: any) {
    console.error('Create monitoring log error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search services
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q = '', type, status, priority, tags } = req.query;

    let query = supabase
      .from('services')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    // Add text search if query provided
    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Add filters
    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (tags && typeof tags === 'string') {
      const tagArray = tags.split(',');
      query = query.contains('tags', tagArray);
    }

    const { data: services, error } = await query;

    if (error) {
      console.error('Search services error:', error);
      return res.status(500).json({ 
        error: 'Failed to search services',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.json(services || []);
  } catch (error: any) {
    console.error('Search services error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;