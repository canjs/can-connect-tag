/*can-connect-tag@0.1.0#can-connect-tag*/
require('can-stache-bindings');
var Observation = require('can-observation');
var expression = require('can-stache/src/expression');
var viewCallbacks = require('can-view-callbacks');
var ObservationRecorder = require('can-observation-recorder');
var nodeLists = require('can-view-nodelist');
var canReflect = require('can-reflect');
var canSymbol = require('can-symbol');
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var each = require('can-reflect').each;
var namespace = require('can-namespace');
var convertToValue = function (arg) {
    if (typeof arg === 'function') {
        return convertToValue(arg());
    } else {
        return arg;
    }
};
function connectTag(tagName, connection) {
    var removeBrackets = function (value, open, close) {
        open = open || '{';
        close = close || '}';
        if (value[0] === open && value[value.length - 1] === close) {
            return value.substr(1, value.length - 2);
        }
        return value;
    };
    viewCallbacks.tag(tagName, function (el, tagData) {
        var getList = el.getAttribute('getList') || el.getAttribute('get-list');
        var getInstance = el.getAttribute('get');
        var attrValue = getList || getInstance;
        var method = getList ? 'getList' : 'get';
        var attrInfo = expression.parse('tmp(' + removeBrackets(attrValue) + ')', { baseMethodType: 'Call' });
        var addedToPageData = false;
        var addToPageData = ObservationRecorder.ignore(function (set, promise) {
            if (!addedToPageData) {
                var root = tagData.scope.peek('%root') || tagData.scope.peek('@root');
                if (root && root.pageData) {
                    if (method === 'get') {
                        set = connection.id(set);
                    }
                    root.pageData(connection.name, set, promise);
                }
            }
            addedToPageData = true;
        });
        var request = new Observation(function () {
            var hash = {};
            if (typeof attrInfo.hash === 'object') {
                each(attrInfo.hash, function (val, key) {
                    if (val && val.hasOwnProperty('get')) {
                        hash[key] = tagData.scope.read(val.get, {}).value;
                    } else {
                        hash[key] = val;
                    }
                });
            } else if (typeof attrInfo.hash === 'function') {
                var getHash = attrInfo.hash(tagData.scope, tagData.options, {});
                each(getHash(), function (val, key) {
                    hash[key] = convertToValue(val);
                });
            } else {
                hash = attrInfo.argExprs.length ? canReflect.getValue(attrInfo.argExprs[0].value(tagData.scope, tagData.options)) : {};
            }
            var promise = connection[method](hash);
            addToPageData(hash, promise);
            return promise;
        });
        el[canSymbol.for('can.viewModel')] = request;
        var nodeList = nodeLists.register([], undefined, tagData.parentNodeList || true);
        var frag = tagData.subtemplate ? tagData.subtemplate(tagData.scope.add(request), tagData.options, nodeList) : document.createDocumentFragment();
        domMutateNode.appendChild.call(el, frag);
        nodeLists.update(nodeList, el.childNodes);
        var removalDisposal = domMutate.onNodeRemoval(el, function () {
            if (!el.ownerDocument.contains(el)) {
                removalDisposal();
                nodeLists.unregister(nodeList);
            }
        });
    });
}
module.exports = namespace.connectTag = connectTag;