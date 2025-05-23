import mongoose from 'mongoose';

let isConnected = false;

export async function connectDatabase() {
    try {
        if (isConnected) {
            return;
        }

        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        isConnected = true;
        
        // Handle connection errors
        mongoose.connection.on('error', (err) => {
        });

        mongoose.connection.on('disconnected', () => {
        });

        return connection;
    } catch (error) {
        isConnected = false;
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
});

mongoose.connection.on('disconnected', () => {
});

mongoose.connection.on('connected', () => {
});

mongoose.connection.on('connecting', () => {
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}); 