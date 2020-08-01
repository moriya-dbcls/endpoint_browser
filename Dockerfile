FROM node:12
COPY . /endpoint_browser
ENV TS_VERSION="0.0.19"
RUN cd "/" && \
    curl -OL https://github.com/togostanza/ts/releases/download/v${TS_VERSION}/ts_${TS_VERSION}_linux_amd64.tar.gz && \
    tar -xf ts_${TS_VERSION}_linux_amd64.tar.gz && \
    mv /ts_${TS_VERSION}_linux_amd64/ts /usr/bin
WORKDIR "/endpoint_browser/ts"
CMD ["ts","server"]
