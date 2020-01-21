Stanza(function(stanza, params) {

    stanza.render({
        template: "stanza.html"
    });

    epBrowser.initDom(params, stanza.select("#renderDiv"));
});
