const { MongoClient } = require('mongodb');

const uri = process.env.DATABASE_URL || 'mongodb://mongo:27017/orderdb';
const client = new MongoClient(uri);

async function initReplSet() {
  try {
    await client.connect();
    const adminDb = client.db('admin');

    const status = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);

    if (status) {
      console.log('Replica set already initialized');
      process.exit(0);
    }

    const config = {
      _id: 'rs0',
      members: [{ _id: 0, host: 'mongo:27017' }],
    };

    await adminDb.command({ replSetInitiate: config });
    console.log('Replica set initiated');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const checkStatus = await adminDb.command({ replSetGetStatus: 1 });
    console.log('Replica set state:', checkStatus.members[0].stateStr);

    process.exit(0);
  } catch (err) {
    console.error('Failed to initiate replica set:', err);
    process.exit(1);
  }
}

initReplSet();
