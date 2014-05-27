
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
    var splunkjs        = require('../../index');
    var ModularInput   = splunkjs.ModularInputs;
    var Scheme          = ModularInput.Scheme;
    var Argument        = ModularInput.Argument;
    var utils           = ModularInput.utils;
    var ET              = require("elementtree");

    splunkjs.Logger.setLevel("ALL");
    return {
        "Scheme tests": {
            setUp: function(done) {
                done();
            },

            "Generate XML from scheme with default values": function(test) {
                // Checks the Scheme generated by creating a Scheme object and setting no fields on it.
                // This test checks for sane defaults in the Scheme class.

                var myScheme = new Scheme("abcd");
                
                var constructed = myScheme.toXML();
                var expected = ET.parse(utils.readFile(__filename, "../data/scheme_with_defaults.xml")).getroot();

                test.equals(myScheme.title, "abcd");
                test.equals(myScheme.description, null);
                test.equals(myScheme.useExternalValidation, true);
                test.equals(myScheme.useSingleInstance, false);
                test.equals(myScheme.streamingMode, Scheme.streamingModeXML);
                test.ok(utils.XMLCompare(expected, constructed));
                test.done();
            },

            "Generate XML from scheme": function(test) {
                // Checks that the XML generated by a Scheme object with all its fields set and
                // some arguments added matches what we expect

                var myScheme = new Scheme("abcd");
                myScheme.description = "쎼 and 쎶 and <&> für";
                myScheme.streamingMode = Scheme.streamingModeSimple;
                myScheme.useExternalValidation = false;
                myScheme.useSingleInstance = true;
                
                test.equals(myScheme.title, "abcd");
                test.equals(myScheme.description, "쎼 and 쎶 and <&> für");
                test.equals(myScheme.streamingMode, Scheme.streamingModeSimple);
                test.equals(myScheme.useExternalValidation, false);
                test.equals(myScheme.useSingleInstance, true);

                var arg1 = new Argument({
                    name: "arg1"
                });
                myScheme.addArgument(arg1);

                var arg2 = new Argument({
                    name: "arg2",
                    description: "쎼 and 쎶 and <&> für",
                    validation: "is_pos_int('some_name')",
                    dataType: Argument.dataTypeNumber,
                    requiredOnEdit: true,
                    requiredOnCreate: false
                });
                myScheme.addArgument(arg2);

                test.equals(myScheme.args.length, 2);

                var constructed = myScheme.toXML();
                var expected = ET.parse(utils.readFile(__filename, "../data/scheme_without_defaults.xml")).getroot();

                test.ok(utils.XMLCompare(expected, constructed));
                test.done();
            },

            "Generate XML from argument with default values": function(test) {
                // Checks that the XML produced from an Argument object that is initialized has
                // is what we expect. This is mostly a check of the default values.

                var myArg = new Argument({name: "some_name"});

                var root = ET.Element("");
                var constructed = myArg.addToDocument(root);

                var expected = ET.parse(utils.readFile(__filename, "../data/argument_with_defaults.xml")).getroot();

                test.equals(myArg.name, "some_name");
                test.ok(utils.XMLCompare(expected, constructed));
                test.done();
            },

            "Generate XML from argument": function(test) {
                // Checks that the XML generated by an Argument object with all possible set matches what
                // we expect.

                var myArg = new Argument({
                    name: "some_name",
                    description: "쎼 and 쎶 and <&> für",
                    validation: "is_pos_int('some_name')",
                    dataType: Argument.dataTypeBoolean,
                    requiredOnEdit: true,
                    requiredOnCreate: true
                });

                test.equals(myArg.name, "some_name");
                test.equals(myArg.description, "쎼 and 쎶 and <&> für");
                test.equals(myArg.validation, "is_pos_int('some_name')");
                test.equals(myArg.dataType, Argument.dataTypeBoolean);
                test.equals(myArg.requiredOnEdit, true);
                test.equals(myArg.requiredOnCreate, true);

                var root = ET.Element("");
                var constructed = myArg.addToDocument(root);

                var expected = ET.parse(utils.readFile(__filename, "../data/argument_without_defaults.xml")).getroot();
                test.ok(utils.XMLCompare(expected, constructed));
                test.done();
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../../index');
    var test        = require('../../contrib/nodeunit/test_reporter');

    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}