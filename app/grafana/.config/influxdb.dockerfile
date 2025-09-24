ARG influxdb_version=2.7
FROM influxdb:${influxdb_version}
USER root

ARG INFLUXDB_TOKEN

ENV INFLUX_HOST=http://influxdb:8086
ENV INFLUX_TOKEN="${INFLUXDB_TOKEN}"
ENV INFLUX_ORG_ID "honeycomb"
ENV INFLUX_BUCKET_NAME "honeycomb"

COPY data/drive.csv /root/drive.csv
COPY influx-setup-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
