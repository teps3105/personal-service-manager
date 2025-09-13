const express = require('express');
const { createClient } = require('@supabase/supabase-js');

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

// Get all services for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new service
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, status, priority } = req.body;

    const { data: service, error } = await supabase
      .from('services')
      .insert([
        {
          user_id: req.user.userId,
          name,
          description,
          type: type || 'general',
          status: status || 'active',
          priority: priority || 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific service
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a service
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, status, priority } = req.body;

    const { data: service, error } = await supabase
      .from('services')
      .update({
        name,
        description,
        type,
        status,
        priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a service
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      total: services.length,
      active: services.filter(s => s.status === 'active').length,
      inactive: services.filter(s => s.status === 'inactive').length,
      completed: services.filter(s => s.status === 'completed').length,
      high_priority: services.filter(s => s.priority === 'high').length,
      medium_priority: services.filter(s => s.priority === 'medium').length,
      low_priority: services.filter(s => s.priority === 'low').length,
      by_type: {}
    };

    // Group by type
    services.forEach(service => {
      stats.by_type[service.type] = (stats.by_type[service.type] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;