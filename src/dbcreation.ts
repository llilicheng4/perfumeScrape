import mongoose from 'mongoose';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017')

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Import your schema/model here
import { Perfume } from './dbSchema';

// Example: Create a new perfume document
const newPerfume = new Perfume({
    NAME: "Baccarat Rouge 540",
    Brand: "Maison Francis Kurkdjian",
    // Fill in the rest of the data
});
