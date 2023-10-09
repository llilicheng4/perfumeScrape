import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the perfume data
interface IPerfume extends Document {
    NAME: string;
    BRAND: string;
    // LAUNCHDATE: number;
    // LONGEVITY: Record<string, number>;
    // SILLAGE: Record<string, number>;
    // "Price/Value": Record<string, number>;
    GENDER: number;
    ACCORDS: { Type: string; Strength: number }[];
    TOP_NOTES: string[];
    MIDDLE_NOTES: string[];
    BASE_NOTES: string[];
    PROS: string[];
    CONS: string[];
    SUMMARY: string;
    DESC: string;
    POPULAR_REVIEWS: string[];
    NEGATIVE_REVIEWS: string[];
}

// Create a schema for the perfume data
const PerfumeSchema = new Schema<IPerfume>({
    NAME: String,
    BRAND: String,
    // LAUNCHDATE: Number,
    // LONGEVITY: Object,
    // SILLAGE: Object,
    // "Price/Value": Object,
    GENDER: Number,
    ACCORDS: [{ Type: String, Strength: Number }],
    TOP_NOTES: [String],
    MIDDLE_NOTES: [String],
    BASE_NOTES: [String],
    PROS: [String],
    CONS: [String],
    SUMMARY: String,
    DESC: String,
    POPULAR_REVIEWS: [String],
    NEGATIVE_REVIEWS: [String],
});

PerfumeSchema.index({ NAME: 1, BRAND: 1 }, { unique: true });
// Create and export the model
export const Perfume = mongoose.model<IPerfume>('Perfume', PerfumeSchema);
