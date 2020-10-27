# The broker autobot

The [Autobots](https://en.wikipedia.org/wiki/Autobot) are benevolent, sentient, **self-configuring** robotic lifeforms from the planet Cybertron.
This particular autobot is designed to ease the configuration updates of [Moleculer](https://moleculer.services/) services [brokers](https://moleculer.services/docs/broker.html).

## Typical use case

You manage multiple Moleculer services and you want to easily update the configuration of the brokers hosting the service instances at once.
For instance, you have common settings for timeouts or log levels for all these brokers.

On start, `broker-autobot` will:

1. get these common settings from a common location through a configurable [Moleculer action](https://moleculer.services/docs/0.14/actions.html)
2. parse these settings through a customizable parser (`broker-autobot` option)
3. create a broker with these settings and create your services with this broker instance
4. start the broker

Additionally `broker-autobot` can subscribe to an customizable event (`broker-autobot` option) in order to be aware of a configuration change.
While receiving this event it will:

1. decide whether this event applies to its configuration through a customizable checker (`broker-autobot` option)
2. stop the current broker instance
3. execute again all the steps from the "On start" list
