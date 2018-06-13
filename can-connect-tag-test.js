import QUnit from 'steal-qunit';
import plugin from './can-connect-tag';

QUnit.module('can-connect-tag');

QUnit.test('Initialized the plugin', function(){
  QUnit.equal(typeof plugin, 'function');
  QUnit.equal(plugin(), 'This is the can-connect-tag plugin');
});
