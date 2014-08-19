// http://stackoverflow.com/questions/6884616/intercept-all-ajax-calls

window.utrelogin = {}; // claim a global scope.

/**
 * Callback registry; needs to live at global scope
 *
 * @type {Object}
 */
window.utrelogin.callback_registry = {};

(function(factory, window) {
    'use strict';

    /*global jQuery:false, define:false */

    /* --- Install the module --- */
    if (typeof define === 'function' && define.amd) {
        // TODO: This is really ugly. Is there a better way to pass non-AMD params?
        define('_windowGlobal', [], function() { return window; });
        define(['jquery', '_windowGlobal'], factory);
    } else {
        // relies on browser global jQuery
        factory(jQuery, window);
    }
}(function($, window, undefined) {
    'use strict';

    /**
     * Regular expression for extracting the base url for the project.
     *
     * @private
     * @const
     * @type {RegExp}
     */
    var PROJ_BASE_REGEX = /^\/apps\/[^\/]+\/[^\/]+\//;

    /**
     * Login popup window options
     * @private
     * @const
     * @type {string}
     */
    var POPUP_OPTIONS = 'toolbar=yes,scrollbars=yes,resizable=yes,dependent=yes,height=500,width=800';

    /** Function for calculating the login redirect url.
     * @private
     * @return {string} A server-relative url for acct_lib's login_redirect.
     */
    function getLoginRedirectUrl() {
        var matches = PROJ_BASE_REGEX.exec(window.location.pathname);
        if (matches){
            var proj_base = matches[0];
            return proj_base + 'acct_lib/login_redirect/';
        }
        else{
            return null;
        }
    }

    /**
     * Main function of the module. Call this to set it up.
     *
     * @public
     * @param {Object} configOptions
     *     Historical. ConfigOptions are ignored.
     *
     * @returns {void}
     */
    function utRelogin(configOptions) {
        var xhr_open = XMLHttpRequest.prototype.open;
        var xhr_send = XMLHttpRequest.prototype.send;

        function startLogin(){
            var redirect_url = getLoginRedirectUrl();
            window.open(redirect_url, null, POPUP_OPTIONS);
        }

        function new_open(method, url, async, user, pass){
            this._open_args = arguments;
            this._async = async;
            this._same_origin_error = null;
            this._current_error = undefined;
            xhr_open.call(this, method, url, async, user, pass);
        }

        function new_send(data){
            var scc =  state_change_closure(this, this.onreadystatechange);
            var no_call = false; // used by state_change to decide whether to call old.
            var sc_complete = false;

            function state_change_closure(self, old){
                if (!old){
                    old = function(){};
                }

                function state_change(){
                    console.info("readyState: " + self.readyState +
                                 " status: " + self.status);

                    if (self.readyState === 4){
                        sc_complete = true;

                        if (self.status === 0){
                            self._same_origin_error = true;
                            console.info('SOE: ' + self._same_origin_error); // TODO: Remove
                        }
                    }

                    if (self._same_origin_error){
                        delete self._current_error; // we can assume this was the error
                        self.abort();
                        startLogin();
                    }
                    else{
                        old.call(self);
                    }
                }
                return state_change;
            }

            this._data = data;
            if (this._async){
                this.onreadystatechange = scc;
            }
            try{
                xhr_send.call(this, data);
            }
            catch(err){
                // we need to defer action on this -- if it is a same origin error,
                // we can ignore it if login is triggered.
                this._current_error = err;
            }
            finally{
                // firefox doesn't fire on synchronous calls, but we need scc called
                if (!(this._async || sc_complete)){
                    no_call = true; // because user code
                    scc();
                }
                delete self._same_origin_error;
            }
        }

        XMLHttpRequest.prototype.open = new_open;
        XMLHttpRequest.prototype.send = new_send;
    }

    utRelogin.prototype.retryLastCall = function () {
        // TODO: can we retry a call?
        alert('resuming!');
    };

    $.utRelogin = utRelogin;
    return utRelogin;
  },
  this));
