import mongoose from 'mongoose';
const uri = process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI;
const c = await mongoose.createConnection(uri, { maxPoolSize:5, minPoolSize:1, serverSelectionTimeoutMS:20000, connectTimeoutMS:20000, maxIdleTimeMS:0, family:4, autoIndex:false }).asPromise();
const col = c.db.collection('products');

// OLD behaviour: select including full images array
let t = Date.now();
try {
  const old = await col.find({}).project({ name:1, slug:1, images:1, priceB2C:1, priceB2B:1, stock:1, sku:1, isActive:1, isFeatured:1, category:1 }).sort({ createdAt:-1 }).limit(20).toArray();
  const bytes = Buffer.byteLength(JSON.stringify(old));
  console.log(`OLD (with images): ${Date.now()-t}ms  payload=${(bytes/1048576).toFixed(2)}MB`);
} catch(e){ console.log('OLD failed:', e.message.slice(0,80)); }

// NEW: first image only, base64 replaced by a marker
t = Date.now();
const firstImg = { $arrayElemAt: ['$images', 0] };
const rows = await col.aggregate([
  { $sort: { createdAt: -1 } }, { $skip: 0 }, { $limit: 20 },
  { $lookup: { from:'categories', localField:'category', foreignField:'_id', as:'c' } },
  { $project: {
      name:1, slug:1, sku:1, priceB2C:1, priceB2B:1, stock:1, isActive:1, isFeatured:1,
      category: { $let: { vars:{ c:{ $arrayElemAt:['$c',0] } }, in:{ _id:'$$c._id', name:'$$c.name', slug:'$$c.slug' } } },
      imageCount: { $size: { $ifNull: ['$images', []] } },
      thumb: { $cond: [
        { $regexMatch: { input: { $ifNull: [firstImg, ''] }, regex: /^https?:\/\// } },
        firstImg, null ] },
  } },
]).toArray();
const nb = Buffer.byteLength(JSON.stringify(rows));
console.log(`NEW (no base64):   ${Date.now()-t}ms  payload=${(nb/1024).toFixed(1)}KB  rows=${rows.length}`);
console.log('sample:', JSON.stringify(rows[0]).slice(0,190));
t = Date.now();
console.log('countDocuments:', await col.countDocuments({}), `(${Date.now()-t}ms)`);
await c.close(); process.exit(0);
