#!/bin/sh

sleep 5
echo Setting up InfluxDB...
influx org create --name honeycomb
influx bucket create --name honeycomb
influx write --bucket honeycomb --format csv --file /root/drive.csv
