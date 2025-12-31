import algoliasearch from 'algoliasearch';

const client = algoliasearch(
  'IP0MLC3H7D',
  '583525a14e2ab274486ea7000be33a50' // ⚠️ 这是 Admin Key
);

const index = client.initIndex('bible-sermons');

async function run() {
  await index.saveObject({
    objectID: 'init',
    type: 'init',
    content: 'init index',
  });

  console.log('Algolia index created');
}

run().catch(console.error);
