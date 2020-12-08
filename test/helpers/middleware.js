const sleep = require('util').promisify(setTimeout);

module.exports = ({ context }) => ({
  created() {
    if (context.middlewareState === 'created') {
      throw new Error('Middleware was not cleanly recycled');
    }
    context.middlewareState = 'created';
  },
  async stopped() {
    await sleep(50);
    context.middlewareState = 'recycled';
  },
});
