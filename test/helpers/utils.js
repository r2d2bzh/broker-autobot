module.exports = {
  describeConfigFactory: () => ({
    name: 'describe-config',
    actions: {
      get: (context) => context.broker.options,
    },
  }),
};
