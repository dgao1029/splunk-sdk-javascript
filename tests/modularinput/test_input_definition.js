
// Copyright 2014 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

exports.setup = function() {

    var splunkjs           = require('../../index');
    var modularinput       = splunkjs.ModularInput;
    var InputDefinition    = modularinput.InputDefinition;
    var fs                 = require("fs");

    splunkjs.Logger.setLevel("ALL");
    return {

        "Input Defintion tests": {
            setUp: function(done) {
                done();
            },

            "Parse produces expected result - no inputs": function(test) {
                var expected = new InputDefinition();
                expected.metadata = {
                    "server_host": "tiny",
                    "server_uri": "https://127.0.0.1:8089",
                    "checkpoint_dir": "/some/dir",
                    "session_key": "123102983109283019283"
                };

                var found = new InputDefinition();
                found.parse(fs.readFileSync("data/conf_with_0_inputs.xml"));
                test.ok(found.equals(expected));
                test.done();
            },

            "Parse produces expected result - 2 inputs": function(test) {
                var expected = new InputDefinition();
                expected.metadata = {
                    "server_host": "tiny",
                    "server_uri": "https://127.0.0.1:8089",
                    "checkpoint_dir": "/some/dir",
                    "session_key": "123102983109283019283"
                };
                expected.inputs["foobar://aaa"] = {
                    "param1": "value1",
                    "param2": "value2",
                    "disabled": "0",
                    "index": "default"
                };
                expected.inputs["foobar://bbb"] = {
                    "param1": "value11",
                    "param2": "value22",
                    "disabled": "0",
                    "index": "default",
                    "multiValue": ["value1", "value2"],
                    "multiValue2": ["value3", "value4"]
                };

                var found = new InputDefinition();
                found.parse(fs.readFileSync("data/conf_with_2_inputs.xml"));
                test.ok(found.equals(expected));
                test.done();
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../../index');
    var NodeHttp    = splunkjs.NodeHttp;
    var test        = require('../../contrib/nodeunit/test_reporter');

    var http = new NodeHttp();
    
    var suite = exports.setup(http);
    test.run([{"Tests": suite}]);
}