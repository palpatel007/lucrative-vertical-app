import mongoose from 'mongoose';

let isConnected = false;

export async function connectDatabase() {
    try {
        if (isConnected) {
            console.log('[Database] Using existing connection');
            return;
        }

        console.log('[Database] Connecting to MongoDB...');
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        isConnected = true;
        console.log('[Database] Successfully connected to MongoDB');
        
        // Handle connection errors
        mongoose.connection.on('error', (err) => {
            console.error('[Database] MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('[Database] MongoDB disconnected');
            isConnected = false;
        });

        return connection;
    } catch (error) {
        console.error('[Database] Error connecting to MongoDB:', {
            message: error.message,
            stack: error.stack
        });
        isConnected = false;
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('[Database] Connection error:', {
    message: err.message,
    name: err.name,
    stack: err.stack
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('[Database] Disconnected from MongoDB');
});

mongoose.connection.on('connected', () => {
  console.log('[Database] Connected to MongoDB');
});

mongoose.connection.on('connecting', () => {
  console.log('[Database] Connecting to MongoDB...');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] Connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('[Database] Error during connection closure:', err);
    process.exit(1);
  }
}); 