import mongoose from 'mongoose';
import Stats from '../models/statsModel.js';
import logger from '../utils/logger.js';

export const trackAPIStats = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    try {
      // Skip tracking if server is shutting down or DB is not connected
      if (req.app?.locals?.isShuttingDown || mongoose.connection?.readyState !== 1) {
        return;
      }

      // Skip tracking for OPTIONS and HEAD requests
      if (!['OPTIONS', 'HEAD'].includes(req.method)) {
        const duration = Date.now() - start;
        await Stats.create({
          endpoint: req.originalUrl,
          method: req.method,
          responseTime: duration,
          statusCode: res.statusCode
        });
      }
    } catch (error) {
      // Ignore database disconnection errors during shutdown or disconnects
      if (error.name === 'MongoNotConnectedError' || mongoose.connection?.readyState !== 1) {
        return;
      }
      logger.warn('Error tracking API stats', { error: error.message });
    }
  });
  
  next();
};