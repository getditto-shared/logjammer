# logjammer

Simple test tool for send high volume of documents to a Ditto collection. It
was originally built to support testing of BLE meshes on Linux ARM boards -
e.g., Raspberry Pi and Jetson computers.

## Setup

Once you have this repo cloned:

1) Create a `./.env` file with the appropriate BigPeer values:

```
APP_ID=
APP_TOKEN=
```

2) Modify the interval/frequency in the `index.ts` file to tune how many writes
per second.  It is currently set for 10Hz or every 100ms.

By default only the BLE transport is enabled. The collection used is `raw_data`.

3) Compile with `tsc index.ts`

## Run

Run with `node index.js`

Stop with `ctrl-c`

## Notes

Testing the receive end was done with https://github.com/getditto-shared/ditto-to-redpanda

A 5-second "sleep" is used before upserts begin, to allow for the remote peers to connect
via BLE.  But, this also works if local upserts run, long before the receiver connects.
