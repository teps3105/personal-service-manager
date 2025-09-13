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

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, name, created_at, updated_at')
      .eq('id', req.user.userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ 
        name,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get current user
    const { data: currentUser, error: getUserError } = await supabase
      .from('profiles')
      .select('password_hash')
      .eq('id', req.user.userId)
      .single();

    if (getUserError || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        password_hash: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(400).json({ error: error.message });
    }

    // If no settings exist, return default settings
    if (!settings) {
      const defaultSettings = {
        user_id: req.user.userId,
        notifications_enabled: true,
        email_notifications: false,
        push_notifications: true,
        theme: 'light',
        language: 'zh-TW',
        timezone: 'Asia/Taipei',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }

      return res.json(newSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { 
      notifications_enabled, 
      email_notifications, 
      push_notifications,
      theme,
      language,
      timezone,
      ntfy_topic
    } = req.body;

    const { data: settings, error } = await supabase
      .from('user_settings')
      .update({ 
        notifications_enabled,
        email_notifications,
        push_notifications,
        theme,
        language,
        timezone,
        ntfy_topic,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // Get current user
    const { data: currentUser, error: getUserError } = await supabase
      .from('profiles')
      .select('password_hash')
      .eq('id', req.user.userId)
      .single();

    if (getUserError || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, currentUser.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    // Delete user data (cascade should handle related records)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.user.userId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Get services activity
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name, type, status, created_at, updated_at')
      .eq('user_id', req.user.userId)
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit));

    // Get notifications activity
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('title, message, status, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    const activity = [
      ...services.map(item => ({
        type: 'service',
        action: item.status,
        title: item.name,
        timestamp: item.updated_at,
        details: `Service ${item.status.toLowerCase()}`
      })),
      ...notifications.map(item => ({
        type: 'notification',
        action: item.status,
        title: item.title,
        timestamp: item.created_at,
        details: item.message
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      activity,
      total: activity.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;