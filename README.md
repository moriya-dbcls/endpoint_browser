# Endpoint browser
[Endpoint browser](https://sparql-support.dbcls.jp/endpoint-browser.html) is a web service to search RDF data in the endpoint using visualised network graph. User can select nodes and execute SPARQL queries from the GUI.

![alt](https://sparql-support.dbcls.jp/file/ep_browser.png)

# For local usage
* for private loocalhost-endpoint ([Endpoint browser](https://sparql-support.dbcls.jp/endpoint-browser.html) service page is only available for open access endpoints.)

## A. Run Endpoint browser via Docker

### Prerequisites

-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker-compose](https://docs.docker.com/compose/install/)

### Usage

Run containers with `docker-compose` and open `http://localhost:3000/html`.

```
    $ git clone https://github.com/moriya-dbcls/endpoint_browser.git
    $ cd endpoint_browser
    $ docker-compose up --build -d
```

Stop containers

```
    $ cd endpoint_browser
    $ docker-compose down
```

## B. Install Endpoint browser to local

* req. [SPARQList](https://github.com/dbcls/sparqlist) and [togostanza](https://github.com/togostanza/ts)

```
    $ git clone https://github.com/moriya-dbcls/endpoint_browser.git
    $ cd endpoint_browser
```

### SPARQlist
#### Node.js
v12.x by [nodebre](https://github.com/hokaccha/nodebrew)

```
    $ curl -L git.io/nodebrew | perl - setup
    [set a path to .nodebrew/current/bin, e.g. $ export PATH=$HOME/.nodebrew/current/bin:$PATH]
    $ nodebrew install v12
    $ nodebrew use v12
```

#### SPARQlist

```
    $ git clone https://github.com/dbcls/sparqlist.git
    $ cd sparqlist
    $ npm install
    $ npm run build
    $ cd ..
```

### togostanza
download binary from [ts release](https://github.com/togostanza/ts/releases) and set a path to 'ts' file

```
    $ curl -OL https://github.com/togostanza/ts/releases/download/v0.0.19/ts_0.0.19_linux_amd64.tar.gz
    $ tar zxvf ts_0.0.19_linux_amd64.tar.gz
    [set a path to 'ts']
```

### endpoint browser
#### move files

```
    $ mv src/sparqlist/*.md sparqlist/repository/
    $ mv src/html sparqlist/public/
```

#### start SPARQList

```
    $ cd sparqlist
    $ PORT=3000 ADMIN_PASSWORD=changeme npm start &
    $ cd ..
```

#### start ts

```
    $ cd ts
    $ ts server &
```

#### start endpoint browser
http://localhost:3000/html/

## Opt.
hard-coded port num and directory name

```
    ts/endpoint-browser/_header.html:2 src="//localhost:3000/html/endpoint-browser.js"
    sparqlist/public/html/index.html:7 href="//localhost:8080/stanza/endpoint-browser/"
    sparqlist/public/html/endpoint-browser.js:11 api: "//localhost:3000/api/"
```

