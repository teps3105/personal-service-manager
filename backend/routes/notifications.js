const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Send notification via ntfy.sh
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { title, message, priority = 3, topic } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const ntfyTopic = topic || process.env.NTFY_TOPIC;
    const ntfyUrl = process.env.NTFY_URL || 'https://ntfy.sh';

    const notificationData = {
      title,
      message,
      priority,
      timestamp: new Date().toISOString()
    };

    // Save notification to database
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: req.user.userId,
          title,
          message,
          priority,
          topic: ntfyTopic,
          status: 'sent',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database save error:', dbError);
      // Continue with sending notification even if database save fails
    }

    // Send to ntfy.sh
    try {
      const response = await axios.post(
        `${ntfyUrl}/${ntfyTopic}`,
        message,
        {
          headers: {
            'Title': title,
            'Priority': priority.toString(),
            'Content-Type': 'text/plain'
          }
        }
      );

      res.json({
        message: 'Notification sent successfully',
        notification: notification || null,
        ntfyResponse: {
          status: response.status,
          topic: ntfyTopic
        }
      });
    } catch (ntfyError) {
      console.error('ntfy.sh send error:', ntfyError);
      
      // Update notification status to failed
      if (notification) {
        await supabase
          .from('notifications')
          .update({ status: 'failed', error_message: ntfyError.message })
          .eq('id', notification.id);
      }

      res.status(500).json({
        error: 'Failed to send notification via ntfy.sh',
        details: ntfyError.message
      });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: notifications, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      notifications,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      total: notifications.length,
      sent: notifications.filter(n => n.status === 'sent').length,
      failed: notifications.filter(n => n.status === 'failed').length,
      by_priority: {
        low: notifications.filter(n => n.priority === 1).length,
        medium: notifications.filter(n => n.priority === 3).length,
        high: notifications.filter(n => n.priority === 5).length
      },
      by_topic: {}
    };

    // Group by topic
    notifications.forEach(notification => {
      stats.by_topic[notification.topic] = (stats.by_topic[notification.topic] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const testNotification = {
      title: 'Personal Service Manager Test',
      message: 'This is a test notification from your Personal Service Manager',
      priority: 3
    };

    const response = await axios.post(
      `${process.env.NTFY_URL || 'https://ntfy.sh'}/${process.env.NTFY_TOPIC}`,
      testNotification.message,
      {
        headers: {
          'Title': testNotification.title,
          'Priority': testNotification.priority.toString(),
          'Content-Type': 'text/plain'
        }
      }
    );

    res.json({
      message: 'Test notification sent successfully',
      response: {
        status: response.status,
        topic: process.env.NTFY_TOPIC
      }
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      details: error.message
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;