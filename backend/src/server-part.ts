// Import routes
import authRoutes from './routes/auth';
import serviceRoutes from './routes/services';
// import notificationRoutes from './routes/notifications';
// import userRoutes from './routes/users';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/users', userRoutes);