import mongoose from 'mongoose';
const uri = process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI;

async function run(label, opts, parallel) {
  const t = Date.now();
  try {
    const c = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000,
      socketTimeoutMS: 45000, family: 4, autoIndex: false, ...opts,
    }).asPromise();
    const col = c.db.collection('products');
    const cat = c.db.collection('categories');
    if (parallel) {
      const r = await Promise.all([
        col.find({}).limit(20).toArray(),
        col.countDocuments({}),
        cat.find({ isActive: true }).toArray(),
      ]);
      console.log(`${label}: OK ${Date.now()-t}ms rows=${r[0].length} total=${r[1]} cats=${r[2].length}`);
    } else {
      const rows = await col.find({}).limit(20).toArray();
      const total = await col.countDocuments({});
      const cats = await cat.find({ isActive: true }).toArray();
      console.log(`${label}: OK ${Date.now()-t}ms rows=${rows.length} total=${total} cats=${cats.length}`);
    }
    await c.close();
  } catch (e) {
    console.log(`${label}: FAIL ${Date.now()-t}ms ${e.name}: ${e.message.slice(0,90)}`);
  }
}

await run('A pool=10 parallel  ', { maxPoolSize: 10 }, true);
await run('B pool=10 sequential', { maxPoolSize: 10 }, false);
await run('C pool=5  parallel  ', { maxPoolSize: 5, minPoolSize: 1 }, true);
await run('D pool=1  parallel  ', { maxPoolSize: 1 }, true);
process.exit(0);
