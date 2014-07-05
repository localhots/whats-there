(function() {
    log('Loaded on', '' + document.location);

    var SHOW_TIMEOUT = 1000,
        LOAD_TIMEOUT = SHOW_TIMEOUT / 4,
        STORAGE = {}
        STOP_WORDS = [
            'signout', 'sign-out', 'sign_out',
            'logout', 'log-out', 'log_out'
        ];

    var links = document.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) {
        var el = links[i],
            href = el.getAttribute('href');

        // Skipping elements that has no href and anchor links
        if (href === null || href[0] === '#') {
            el.addEventListener('mouseover', function(e) {
                log('Pseudolink');
            });
            continue;
        }
        // Checking for "stop-words"
        for (var i = 0; i < STOP_WORDS.length; i++) {
            if (href.indexOf(STOP_WORDS[i]) > -1) {
                var word = '' + STOP_WORDS[i];
                el.addEventListener('mouseover', function(e) {
                    log('Link contains a stop-word "'+ word +'":', href);
                });
                continue;
            }
        };

        STORAGE[i] = {};
        (function(i) {
            var el = links[i];

            el.addEventListener('mouseover', function(e) {
                if (STORAGE[i].result === undefined) {
                    log('Loading page in '+ LOAD_TIMEOUT +'ms');
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
                } else {
                    log('Page already loaded');
                }

                STORAGE[i].show_timeout = after(SHOW_TIMEOUT, function() {
                    log('Time for result!');
                    if (STORAGE[i].result !== undefined) {
                        showTooltip(el, STORAGE[i].result, STORAGE[i].e);
                    }
                });
            });

            var abort = function(e) {
                log('Aborting');
                hideTooltip();

                if (STORAGE[i].xhr !== undefined) {
                    var state = STORAGE[i].xhr.readyState,
                        done = STORAGE[i].xhr.DONE;

                    if (state !== done) {
                        STORAGE[i].xhr.abort();
                        log('XHR aborted!');
                    }
                }

                window.clearTimeout(STORAGE[i].load_timeout);
                window.clearTimeout(STORAGE[i].show_timeout);

                delete STORAGE[i].xhr;
                delete STORAGE[i].e;
                delete STORAGE[i].load_timeout;
                delete STORAGE[i].show_timeout;
            }
            el.addEventListener('mouseout', abort);
            el.addEventListener('click', abort);

            el.addEventListener('mousemove', function(e) {
                STORAGE[i].e = e;
            });
        })(i);
    }

    function showTooltip(el, info, e) {
        var t = document.getElementById('whats-there-tooltip');
        if (t !== null) {
            log('Not showing tooltip, there is one already');
            return;
        }

        if (info.title === undefined && info.description === undefined) {
            log('Not showing tooltip, missing both title and description attributes');
            return;
        }

        var t = document.createElement('div'),
            body = document.getElementsByTagName('body')[0],
            bounds = el.getBoundingClientRect();

        t.setAttribute('class', 'whats-there-tooltip');
        t.setAttribute('id', 'whats-there-tooltip');

        if (info.image_url !== undefined) {
            var div = document.createElement('div');
            div.setAttribute('class', 'whats-there-img');
            div.style.backgroundImage = 'url(' + info.image_url + ')';
            t.appendChild(div);
        }

        if (info.title !== undefined) {
            var div = document.createElement('div');
            div.setAttribute('class', 'whats-there-title');
            div.innerText = info.title;
            t.appendChild(div);
        }

        if (info.description !== undefined) {
            var div = document.createElement('div');
            div.setAttribute('class', 'whats-there-description');
            div.innerText = info.description;
            t.appendChild(div);
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
        t.appendChild(div);

        body.appendChild(t);
        moveTooltip(e);
    }

    function hideTooltip() {
        var t = document.getElementById('whats-there-tooltip');
        if (t !== null) {
            t.parentNode.removeChild(t);
        }
    }

    function moveTooltip(e) {
        // Compact naming:
        // t = Tooltip
        // w = Window
        // s = Scroll offset
        // e = Event (mousemove) position
        var t = document.getElementById('whats-there-tooltip'),
            t_width = t.clientWidth,
            t_height = t.clientHeight,
            w_width = window.innerWidth,
            w_height = window.innerHeight,
            s_top = (window.pageYOffset || document.documentElement.scrollTop),
            s_left = (window.pageXOffset || document.documentElement.scrollLeft),
            e_top = e.clientY,
            e_left = e.clientX;

        log('Positioning tooltip');
        log('Window: '+ w_width +'×'+ w_height);
        log('Scroll: '+ s_left +','+ s_top);
        log('Event: '+ e_left +','+ e_top);

        // Default positioning
        var t_top = s_top + e_top - t_height - 20,
            t_left = s_left + e_left - t_width / 2;

        log('Initial position: '+ t_left +','+ t_top);

        if (e_top - t_height - 20 < 10) {
            // Vertical positioning correction
            t_top = s_top + 10;

            if (e_left > w_width / 2) {
                t_left = s_left + e_left - t_width - 20;
            } else {
                t_left = s_left + e_left + 20;
            }
        } else {
            // Horizontal positioning correction
            if (e_left - t_width / 2 - 10 < s_left) {
                t_left = 10;
            } else if (t_left + t_width + 10 > w_width) {
                t_left = w_width - t_width - 10;
            }
        }

        log('Position after correction: '+ t_left +','+ t_top);

        t.style.top = t_top + 'px';
        t.style.left = t_left + 'px';
    }

    function loadPageInfo(url, callback) {
        // TODO: Fetch wikipedia URLs from api instead of given URL
        // http://en.wikipedia.org/w/api.php?format=json&action=query&titles=Page_Name&prop=info|pageimages|extracts&pithumbsize=300

        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (this.readyState === this.HEADERS_RECEIVED) {
                var ct = this.getResponseHeader('Content-Type');

                // Aborting page load if it's not HTML
                if (ct === null || ct.indexOf('text/html') !== 0) {
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
        if (typeof console !== 'undefined') {
            Array.prototype.unshift.call(arguments, '[Whats There]');
            console.log.apply(console, arguments);
        }
    }
})();
