(function() {
    var SHOW_TIMEOUT = 1000,
        LOAD_TIMEOUT = SHOW_TIMEOUT / 4,
        STORAGE = {};

    var links = document.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) {
        var el = links[i],
            href = el.getAttribute('href');

        // Skipping elements that has no href and anchor links
        if (href === null || href[0] === '#') {
            continue;
        }

        STORAGE[i] = {};
        (function(i) {
            var el = links[i];

            el.addEventListener('mouseover', function(e) {
                log('The mouse is OVER!');

                if (STORAGE[i].result === undefined) {
                    STORAGE[i].load_timeout = after(LOAD_TIMEOUT, function() {
                        STORAGE[i].xhr = loadPageInfo(el.href, function(res) {
                            log('Result loaded:', res);
                            STORAGE[i].result = res;
                            delete STORAGE[i].xhr;

                            var tt = document.getElementById('whats-there-tooltip');
                            if (tt === null) {
                                showTooltip(el, STORAGE[i].result, STORAGE[i].e);
                            }
                        });
                    });
                }

                STORAGE[i].show_timeout = after(SHOW_TIMEOUT, function() {
                    log('Time for result!');
                    if (STORAGE[i].result !== undefined) {
                        showTooltip(el, STORAGE[i].result, STORAGE[i].e);
                    }
                });
            });

            el.addEventListener('mouseout', function(e) {
                hideTooltip();
                log('The mouse is OUT!');

                if (STORAGE[i].xhr !== undefined) {
                    STORAGE[i].xhr.abort();
                    log('XHR aborted!');
                }
                window.clearTimeout(STORAGE[i].load_timeout);
                window.clearTimeout(STORAGE[i].show_timeout);
            });

            el.addEventListener('mousemove', function(e) {
                STORAGE[i].e = e;
            });
        })(i);
    }

    function showTooltip(el, info, e) {
        var tt = document.getElementById('whats-there-tooltip');
        if (tt !== null) {
            // Don't show a tooltip if there's one already
            return;
        }

        if (info.title === undefined && info.description === undefined) {
            // Don't show a tooltip if there's no title nor descriptions for the page
            return;
        }

        var tt = document.createElement('div'),
            body = document.getElementsByTagName('body')[0],
            bounds = el.getBoundingClientRect();

        tt.setAttribute('class', 'whats-there-tooltip');
        tt.setAttribute('id', 'whats-there-tooltip');

        if (info.image_url !== undefined) {
            var div = document.createElement('div');
            div.setAttribute('class', 'whats-there-img');
            div.style.backgroundImage = 'url(' + info.image_url + ')';
            tt.appendChild(div);
        }

        if (info.title !== undefined) {
            var div = document.createElement('div');
            div.setAttribute('class', 'whats-there-title');
            div.innerText = info.title;
            tt.appendChild(div);
        }

        if (info.description !== undefined) {
            var div = document.createElement('div');
            div.setAttribute('class', 'whats-there-description');
            div.innerText = info.description;
            tt.appendChild(div);
        }

        var site_name;
        if (info.site_name === undefined) {
            site_name = info.host;
        } else {
            site_name = info.site_name + ' (' + info.host + ')';
        }
        var div = document.createElement('div');
        div.setAttribute('class', 'whats-there-site');
        div.innerText = site_name;
        tt.appendChild(div);

        body.appendChild(tt);
        moveTooltip(e);
    }

    function hideTooltip() {
        var tt = document.getElementById('whats-there-tooltip');
        if (tt !== null) {
            tt.parentNode.removeChild(tt);
        }
    }

    function moveTooltip(e) {
        var tt = document.getElementById('whats-there-tooltip'),
            tt_width = tt.clientWidth,
            tt_height = tt.clientHeight,
            w_width = window.innerWidth,
            w_height = window.innerHeight,
            s_top = document.documentElement.scrollTop,
            s_left = document.documentElement.scrollLeft,
            e_top = e.clientY,
            e_left = e.clientX;

        var tt_top = s_top + e_top - tt_height - 20,
            tt_left = s_left + e_left - tt_width / 2;

        // Vertical positioning fix
        if (tt_top < 10) {
            tt_top = 10;

            if (e_left > w_width / 2) {
                tt_left = s_left + e_left - tt_width - 20;
            } else {
                tt_left = s_left + e_left + 20;
            }
        } else {
            // Horizontal positioning fixes
            if (e_left - tt_width / 2 - 10 < s_left) {
                tt_left = 10;
            } else if (tt_left + tt_width + 10 > w_width) {
                tt_left = w_width - tt_width - 10;
            }
        }

        tt.style.top = tt_top + 'px';
        tt.style.left = tt_left + 'px';
    }

    function loadPageInfo(url, callback) {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (this.readyState === this.HEADERS_RECEIVED) {
                var ct = this.getResponseHeader('Content-Type');

                // Aborting page load if it's not HTML
                if (ct === null || ct.indexOf('text/html') != 0) {
                    this.abort();
                }
            } else if (this.readyState === this.DONE && this.status === 200) {
                var result = parseTags(this.responseText),
                    tokens = url.split('/');

                result.protocol = tokens[0];
                result.host = tokens[2];
                if (result.image_url !== undefined) {
                    result.image_url = makeAbsoluteURL(url, result.image_url);
                }

                callback(result);
            }
        }

        xhr.open('GET', url, true);
        xhr.send(null);

        return xhr;
    }

    function parseTags(html) {
        var parser = new DOMParser(),
            result = {};

        var doc = parser.parseFromString(html, 'text/html');

        var title = doc.getElementsByTagName('title')[0];
        if (title !== undefined) {
            result.title = title.innerText;
        }

        var tags = doc.getElementsByTagName('meta');
        for (var i = 0; i < tags.length; i++) {
            var el = tags[i],
                name = el.getAttribute('name'),
                property = el.getAttribute('property'),
                content = el.getAttribute('content'),
                has_content = (content !== null && content.length > 0);

            if (property === 'og:title' && has_content) {
                result.title = content;
            } else if (name === 'description' && has_content) {
                result.description = content;
            } else if (property === 'og:description' && has_content) {
                result.description = content;
            } else if (property === 'og:image' && has_content) {
                result.image_url = content;
            } else if (property === 'og:site_name' && has_content) {
                result.site_name = content;
            }
        }

        return result;
    }

    function makeAbsoluteURL(page_url, link_url) {
        var tokens = link_url.split('/'),
            page = document.createElement('a'),
            link = document.createElement('a');

        page.href = page_url;
        link.href = link_url;

        if ((tokens[0] === 'http:' || tokens[0] === 'https:') && tokens[1] === '') {
            // Assuming it's an absolute URL already
            return link_url;
        } else if (link_url.slice(0, 2) === '//') {
            // Relative protocol
            return page.protocol + link_url;
        } else {
            return [
                page.protocol,
                '//',
                page.host,
                link.pathname,
                link.search
            ].join('')
        }
    }

    function after(timeout, func) {
        return window.setTimeout(func, timeout);
    }

    function log() {
        if (false && console) {
            console.log.apply(console, arguments);
        }
    }
})();
