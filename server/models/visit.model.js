import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
    {
        shortId: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timeseries: {
            timeField: 'timestamp',
            metaField: 'shortId',
            granularity: 'seconds',
        },
    }
);

const Visit = mongoose.model('Visit', visitSchema);

export default Visit;