
// Copyright 2011 Splunk, Inc.
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

exports.setup = function(svc) {
    var splunkjs    = require('../splunk');
    var utils       = splunkjs.Utils;
    var Async       = splunkjs.Async;
    var tutils      = require('./utils');

    splunkjs.Logger.setLevel("ALL");
    var idCounter = 0;
    var getNextId = function() {
        return "id" + (idCounter++) + "_" + ((new Date()).valueOf());
    };

    return {
        "Job Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Create+abort job": function(test) {
                var sid = getNextId();
                var options = {id: sid};
                var jobs = this.service.jobs({app: "new_english"});
                var req = jobs.oneshotSearch('search index=_internal |  head 1 | sleep 10', options, function(err, job) {   
                    test.ok(err);
                    test.ok(!job);
                    test.strictEqual(err.error, "abort");
                    test.done();
                }); 
                
                splunkjs.Async.sleep(1000, function() {
                    req.abort();
                });
            },

            "Callback#Create+cancel job": function(test) {
                var sid = getNextId();
                this.service.jobs().search('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    job.cancel(function() {
                        test.done();
                    });
                }); 
            },

            "Callback#Create job error": function(test) {
                var sid = getNextId();
                this.service.jobs().search({search: 'index=_internal | head 1', id: sid}, function(err) { 
                    test.ok(!!err);
                    test.done(); 
                });
            },

            "Callback#List jobs": function(test) {
                this.service.jobs().refresh(function(err, jobs) {
                    test.ok(!err);
                    test.ok(jobs);
                    
                    var jobsList = jobs.list();
                    test.ok(jobsList.length > 0);
                    
                    for(var i = 0; i < jobsList.length; i++) {
                        test.ok(jobsList[i]);
                    }
                    
                    test.done();
                });
            },

            "Callback#Contains job": function(test) {
                var that = this;
                var sid = getNextId();
                var jobs = this.service.jobs();
                
                jobs.search('search index=_internal | head 1', {id: sid}, function(err, job) {   
                    test.ok(job);
                    test.strictEqual(job.sid, sid);

                    jobs.refresh(function(err, jobs) {
                        var job = jobs.contains(sid);
                        test.ok(job);

                        job.cancel(function() {
                            test.done();
                        });
                    });
                }); 
            },

            "Callback#job results": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().content["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.results({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job events": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().content["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.events({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, results.rows[0].length);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#job results preview": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().content["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.preview({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },

            "Callback#Enable + disable preview": function(test) {
                var that = this;
                var sid = getNextId();
                
                var service = this.service.specialize("nobody", "new_english");
                
                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 60', {id: sid}, done);
                        },
                        function(job, done) {
                            job.enablePreview(done);
                            
                        },
                        function(job, done) {
                            job.disablePreview(done);
                        },
                        function(job, done) {
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Pause + unpause + finalize preview": function(test) {
                var that = this;
                var sid = getNextId();
                
                var service = this.service.specialize("nobody", "new_english");
                
                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.pause(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job, 
                                function(j) {
                                    return j.properties().content["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(job.properties().content["isPaused"]);
                            job.unpause(done);
                        },
                        function(job, done) {
                            tutils.pollUntil(
                                job, 
                                function(j) {
                                    return !j.properties().content["isPaused"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            test.ok(!job.properties().content["isPaused"]);
                            job.finalize(done);
                        },
                        function(job, done) {
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Set TTL": function(test) {
                var sid = getNextId();
                var originalTTL = 0;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.refresh(done);
                        },
                        function(job, done) {
                            var ttl = job.properties().content["ttl"];
                            originalTTL = ttl;
                            
                            job.setTTL(ttl*2, done);
                        },
                        function(job, done) {
                            job.refresh(done);
                        },
                        function(job, done) {
                            var ttl = job.properties().content["ttl"];
                            test.ok(ttl > originalTTL);
                            test.ok(ttl <= (originalTTL*2));
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Set priority": function(test) {
                var sid = getNextId();
                var originalPriority = 0;
                var that = this;
                
                var service = this.service.specialize("nobody", "new_english");
                
                Async.chain([
                        function(done) {
                            service.jobs().search('search index=_internal | head 1 | sleep 5', {id: sid}, done);
                        },
                        function(job, done) {
                            job.refresh(done);
                        },
                        function(job, done) {
                            var priority = job.properties().content["priority"];
                            test.ok(priority, 5);
                            job.setPriority(priority + 1, done);
                        },
                        function(job, done) {
                            job.refresh(done);
                        },
                        function(job, done) {
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Search log": function(test) {
                var sid = getNextId();
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.searchlog(done);
                        },
                        function(log, job, done) {
                            test.ok(job);
                            test.ok(log);
                            test.ok(log.length > 0);
                            test.ok(log.split("\r\n").length > 0);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Search summary": function(test) {
                var sid = getNextId();
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search(
                                'search index=_internal | head 1 | eval foo="bar" | fields foo', 
                                {
                                    id: sid,
                                    status_buckets: 300,
                                    rf: ["foo"]
                                }, 
                                done);
                        },
                        function(job, done) {
                            job.summary({}, done);
                        },
                        function(summary, job, done) {
                            test.ok(job);
                            test.ok(summary);
                            test.strictEqual(summary.event_count, 1);
                            test.strictEqual(summary.fields.foo.count, 1);
                            test.strictEqual(summary.fields.foo.distinct_count, 1);
                            test.ok(summary.fields.foo.is_exact, 1);
                            test.strictEqual(summary.fields.foo.name, "foo");
                            test.strictEqual(summary.fields.foo.modes.length, 1);
                            test.strictEqual(summary.fields.foo.modes[0].count, 1);
                            test.strictEqual(summary.fields.foo.modes[0].value, "bar");
                            test.ok(summary.fields.foo.modes[0].is_exact);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Search timeline": function(test) {
                var sid = getNextId();
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search(
                                'search index=_internal | head 1 | eval foo="bar" | fields foo', 
                                {
                                    id: sid,
                                    status_buckets: 300,
                                    rf: ["foo"],
                                    exec_mode: "blocking"
                                }, 
                                done);
                        },
                        function(job, done) {
                            job.timeline({}, done);
                        },
                        function(timeline, job, done) {
                            test.ok(job);
                            test.ok(timeline);
                            test.strictEqual(timeline.buckets.length, 1);
                            test.strictEqual(timeline.event_count, 1);
                            test.strictEqual(timeline.buckets[0].available_count, 1);
                            test.strictEqual(timeline.buckets[0].duration, 0.001);
                            test.strictEqual(timeline.buckets[0].earliest_time_offset, timeline.buckets[0].latest_time_offset);
                            test.strictEqual(timeline.buckets[0].total_count, 1);
                            test.ok(timeline.buckets[0].is_finalized);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Touch": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            that.service.jobs().search('search index=_internal | head 1', {id: sid}, done);
                        },
                        function(job, done) {
                            job.refresh(done);
                        },
                        function(job, done) {
                            test.ok(job);
                            originalTime = job.properties().content.updated;
                            Async.sleep(1200, function() { job.touch(done); });
                        },
                        function(job, done) {
                            job.refresh(done);
                        },
                        function(job, done) {
                            test.ok(originalTime !== job.properties().updated);
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Oneshot search": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            that.service.jobs().oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.ok(results.fields);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.ok(results.rows);
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.rows[0].length, 1);
                            test.strictEqual(results.rows[0][0], "1");
                            
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },

            "Callback#Service oneshot search": function(test) {
                var sid = getNextId();
                var that = this;
                var originalTime = "";
                
                Async.chain([
                        function(done) {
                            that.service.oneshotSearch('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(results, done) {
                            test.ok(results);
                            test.ok(results.fields);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.ok(results.rows);
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.rows[0].length, 1);
                            test.strictEqual(results.rows[0][0], "1");
                            
                            done();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                ); 
            },
                        
            "Callback#Service search": function(test) {
                var sid = getNextId();
                var service = this.service;
                var that = this;
                
                Async.chain([
                        function(done) {
                            that.service.search('search index=_internal | head 1 | stats count', {id: sid}, done);
                        },
                        function(job, done) {
                            test.strictEqual(job.sid, sid);
                            tutils.pollUntil(
                                job,
                                function(j) {
                                    return job.properties().content["isDone"];
                                },
                                10,
                                done
                            );
                        },
                        function(job, done) {
                            job.results({}, done);
                        },
                        function(results, job, done) {
                            test.strictEqual(results.rows.length, 1);
                            test.strictEqual(results.fields.length, 1);
                            test.strictEqual(results.fields[0], "count");
                            test.strictEqual(results.rows[0][0], "1");
                            job.cancel(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        },
        
        "App Tests": {      
            setUp: function(done) {
                this.service = svc;
                done();
            },
                         
            "Callback#list applications": function(test) {
                var apps = this.service.apps();
                apps.refresh(function(err, apps) {
                    var appList = apps.list();
                    test.ok(appList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains applications": function(test) {
                var apps = this.service.apps();
                apps.refresh(function(err, apps) {
                    var app = apps.contains("search");
                    test.ok(app);
                    test.done();
                });
            },
            
            "Callback#create + contains app": function(test) {
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                apps.create({name: name}, function(err, app) {
                    var appName = app.properties().name;
                    apps.refresh(function(err, apps) {
                        var entity = apps.contains(appName);
                        test.ok(entity);
                        app.remove(function() {
                            test.done();
                        });
                    });
                });
            },
            
            "Callback#create + modify app": function(test) {
                var DESCRIPTION = "TEST DESCRIPTION";
                var VERSION = "1.1";
                
                var name = "jssdk_testapp_" + getNextId();
                var apps = this.service.apps();
                
                Async.chain([
                    function(callback) {
                        apps.create({name: name}, callback);     
                    },
                    function(app, callback) {
                        app.update({
                            description: DESCRIPTION,
                            version: VERSION
                        }, callback);
                    },
                    function(app, callback) {
                        test.ok(app);
                        app.refresh(callback);  
                    },
                    function(app, callback) {
                        test.ok(app);
                        var properties = app.properties();
                        
                        test.strictEqual(properties.content.description, DESCRIPTION);
                        test.strictEqual(properties.content.version, VERSION);
                        
                        app.remove(callback);
                    },
                    function(callback) {
                        test.done();
                        callback();
                    }
                ]);
            },
            
            "Callback#delete test applications": function(test) {
                var apps = this.service.apps();
                apps.refresh(function(err, apps) {
                    var appList = apps.list();
                    
                    Async.parallelEach(
                        appList,
                        function(app, idx, callback) {
                            if (utils.startsWith(app.properties().name, "jssdk_")) {
                                app.remove(callback);
                            }
                            else {
                                callback();
                            }
                        }, function(err) {
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },
        
        "Saved Search Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh(function(err, searches) {
                    var savedSearches = searches.list();
                    test.ok(savedSearches.length > 0);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#contains": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh(function(err, searches) {
                    var search = searches.contains("Indexing workload");
                    test.ok(search);
                    
                    test.done();
                });
            },
            
            "Callback#history": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh(function(err, searches) {
                    var search = searches.contains("Indexing workload");
                    test.ok(search);
                    
                    search.history(function(err, history, search) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Callback#suppress": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh(function(err, searches) {
                    var search = searches.contains("Indexing workload");
                    test.ok(search);
                    
                    search.suppressInfo(function(err, info, search) {
                        test.ok(!err);
                        test.done();
                    });
                });
            },
            
            "Callback#list limit count": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh({count: 2}, function(err, searches) {
                    var savedSearches = searches.list();
                    test.strictEqual(savedSearches.length, 2);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#list filter": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh({search: "Error"}, function(err, searches) {
                    var savedSearches = searches.list();
                    test.ok(savedSearches.length > 0);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#list offset": function(test) {
                var searches = this.service.savedSearches();
                searches.refresh({offset: 2, count: 1}, function(err, searches) {
                    var savedSearches = searches.list();
                    test.strictEqual(savedSearches.length, 1);
                    
                    for(var i = 0; i < savedSearches.length; i++) {
                        test.ok(savedSearches[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#create + modify + delete saved search": function(test) {
                var name = "jssdk_savedsearch";
                var originalSearch = "search * | head 1";
                var updatedSearch = "search * | head 10";
                var updatedDescription = "description";
            
                var searches = this.service.savedSearches({owner: this.service.username, app: "new_english"});
                
                Async.chain([
                        function(done) {
                            searches.create({search: originalSearch, name: name}, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            
                            test.strictEqual(search.properties().name, name); 
                            test.strictEqual(search.properties().content.search, originalSearch);
                            test.ok(!search.properties().content.description);
                            
                            search.update({search: updatedSearch}, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            test.ok(search);
                            
                            test.strictEqual(search.properties().name, name); 
                            test.strictEqual(search.properties().content.search, updatedSearch);
                            test.ok(!search.properties().content.description);
                            
                            search.update({description: updatedDescription}, done);
                        },
                        function(search, done) {
                            test.ok(search);
                            test.ok(search);
                            
                            test.strictEqual(search.properties().name, name); 
                            test.strictEqual(search.properties().content.search, updatedSearch);
                            test.strictEqual(search.properties().content.description, updatedDescription);
                            
                            search.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#delete test saved searches": function(test) {
                var searches = this.service.savedSearches({owner: this.service.username, app: "new_english"});
                searches.refresh(function(err, searches) {
                    var searchList = searches.list();                  
                    Async.parallelEach(
                        searchList,
                        function(search, idx, callback) {
                            if (utils.startsWith(search.properties().name, "jssdk_")) {
                                search.remove(callback);
                            }
                            else {
                                callback();
                            }
                        }, function(err) {
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },
        
        "Properties Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().refresh(done); },
                    function(props, done) { 
                        var files = props.list();
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().refresh(done); },
                    function(props, done) { 
                        var file = props.contains("web");
                        test.ok(file);
                        file.refresh(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.properties().name, "web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains stanza": function(test) {
                var that = this;
                
                Async.chain([
                    function(done) { that.service.properties().refresh(done); },
                    function(props, done) { 
                        var file = props.contains("web");
                        test.ok(file);
                        file.refresh(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.properties().name, "web");
                        
                        var stanza = file.contains("settings");
                        test.ok(stanza);
                        stanza.refresh(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().content.hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#create file + create stanza + update stanza": function(test) {
                var that = this;
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                Async.chain([
                    function(done) {
                        var properties = that.service.properties(); 
                        properties.refresh(done);
                    },
                    function(properties, done) {
                        properties.create(fileName, done);
                    },
                    function(file, done) {
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        stanza.update({"jssdk_foobar": value});
                        tutils.pollUntil(
                            stanza, function(s) {
                                return s.properties().content["jssdk_foobar"] === value;
                            }, 
                            10, 
                            done
                        );
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.properties().content["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new splunkjs.Service.PropertyFile(svc, fileName);
                        file.refresh(done);
                    },
                    function(file, done) {
                        var stanza = file.contains("stanza");
                        test.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
        },
        
        "Configuration Tests": {        
            setUp: function(done) {
                this.service = svc;
                done();
            },
                   
            "Callback#list": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                
                Async.chain([
                    function(done) { that.service.configurations(namespace).refresh(done); },
                    function(props, done) { 
                        var files = props.list();
                        test.ok(files.length > 0);
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                
                Async.chain([
                    function(done) { that.service.configurations(namespace).refresh(done); },
                    function(props, done) { 
                        var file = props.contains("web");
                        test.ok(file);
                        file.refresh(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.properties().name, "conf-web");
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#contains stanza": function(test) {
                var that = this;
                var namespace = {owner: "admin", app: "search"};
                
                Async.chain([
                    function(done) { that.service.configurations(namespace).refresh(done); },
                    function(props, done) { 
                        var file = props.contains("web");
                        test.ok(file);
                        file.refresh(done);
                    },
                    function(file, done) {
                        test.strictEqual(file.properties().name, "conf-web");
                        
                        var stanza = file.contains("settings");
                        test.ok(stanza);
                        stanza.refresh(done);
                    },
                    function(stanza, done) {
                        test.ok(stanza.properties().content.hasOwnProperty("httpport"));
                        done();
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
                   
            "Callback#create file + create stanza + update stanza": function(test) {
                var that = this;
                var namespace = {owner: "nobody", app: "system"};
                var fileName = "jssdk_file";
                var value = "barfoo_" + getNextId();
                
                Async.chain([
                    function(done) {
                        var configs = svc.configurations(namespace); 
                        configs.refresh(done);
                    },
                    function(configs, done) {
                        configs.create({__conf: fileName}, done);
                    },
                    function(file, done) {
                        file.create("stanza", done);
                    },
                    function(stanza, done) {
                        stanza.update({"jssdk_foobar": value});
                        tutils.pollUntil(
                            stanza, function(s) {
                                return s.properties().content["jssdk_foobar"] === value;
                            }, 
                            10, 
                            done
                        );
                    },
                    function(stanza, done) {
                        test.strictEqual(stanza.properties().content["jssdk_foobar"], value);
                        done();
                    },
                    function(done) {
                        var file = new splunkjs.Service.ConfigurationFile(svc, fileName);
                        file.refresh(done);
                    },
                    function(file, done) {
                        var stanza = file.contains("stanza");
                        test.ok(stanza);
                        stanza.remove(done);
                    }
                ],
                function(err) {
                    test.ok(!err);
                    test.done();
                });
            },
        },
        
        "Index Tests": {      
            setUp: function(done) {
                this.service = svc;
                
                // Create the index for everyone to use
                var name = this.indexName = "sdk-tests";
                var indexes = this.service.indexes();
                indexes.create(name, {}, function(err, index) {
                    if (err && err.status !== 409) {
                        throw new Error("Index creation failed for an unknown reason");
                    }
                    
                    done();
                });
            },
                         
            "Callback#list indexes": function(test) {
                var indexes = this.service.indexes();
                indexes.refresh(function(err, indexes) {
                    var indexList = indexes.list();
                    test.ok(indexList.length > 0);
                    test.done();
                });
            },
                   
            "Callback#contains index": function(test) {
                var indexes = this.service.indexes();
                var indexName = this.indexName;
                
                indexes.refresh(function(err, indexes) {
                    var index = indexes.contains(indexName);
                    test.ok(index);
                    test.done();
                });
            },
            
            "Callback#modify index": function(test) {
                
                var name = this.indexName;
                var indexes = this.service.indexes();
                var originalAssureUTF8Value = false;
                
                Async.chain([
                        function(callback) {
                            indexes.refresh(callback);     
                        },
                        function(indexes, callback) {
                            var index = indexes.contains(name);
                            test.ok(index);
                            
                            originalAssureUTF8Value = index.properties().content.assureUTF8;
                            index.update({
                                assureUTF8: !originalAssureUTF8Value
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();
                            
                            test.strictEqual(!originalAssureUTF8Value, properties.content.assureUTF8);
                            
                            index.update({
                                assureUTF8: !properties.assureUTF8
                            }, callback);
                        },
                        function(index, callback) {
                            test.ok(index);
                            var properties = index.properties();
                            
                            test.strictEqual(originalAssureUTF8Value, properties.content.assureUTF8);
                            callback();
                        },
                        function(callback) {
                            callback();
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
                   
            "Callback#Index submit event": function(test) {
                var message = "Hello World -- " + getNextId();
                var sourcetype = "sdk-tests";
                
                var originalEventCount = null;
                var indexName = this.indexName;
                var indexes = this.service.indexes();
                Async.chain([
                        function(done) {
                            indexes.refresh(done);     
                        },
                        function(indexes, done) {
                            var index = indexes.contains(indexName);
                            test.ok(index);
                            
                            test.strictEqual(index.properties().name, indexName);
                            originalEventCount = index.properties().content.totalEventCount;
                            
                            index.submitEvent(message, {sourcetype: sourcetype}, done);
                        },
                        function(eventInfo, index, done) {
                            test.ok(eventInfo);
                            test.strictEqual(eventInfo.sourcetype, sourcetype);
                            test.strictEqual(eventInfo.bytes, message.length);
                            test.strictEqual(eventInfo._index, indexName);
                            
                            // We could poll to make sure the index has eaten up the event,
                            // but unfortunately this can take an unbounded amount of time.
                            // As such, since we got a good response, we'll just be done with it.
                            done();
                        },
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done(); 
                    }
                );
            }
        },
        
        "User Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#Current user": function(test) {
                var service = this.service;
                
                service.currentUser(function(err, user) {
                    test.ok(!err);
                    test.ok(user);
                    test.strictEqual(user.properties().name, service.username);
                    test.done();
                });
            },
            
            "Callback#List users": function(test) {
                var service = this.service;
                
                service.users().refresh(function(err, users) {
                    var userList = users.list();
                    test.ok(!err);
                    test.ok(users);
                    
                    test.ok(userList);
                    test.ok(userList.length > 0);
                    test.done();
                });
            },
            
            "Callback#Create + update + delete user": function(test) {
                var service = this.service;
                var name = "jssdk_testuser";
                
                Async.chain([
                        function(done) {
                            service.users().create({name: "jssdk_testuser", password: "abc", roles: "user"}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            
                            user.refresh(done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().name, name);
                            test.strictEqual(user.properties().content.roles.length, 1);
                            test.strictEqual(user.properties().content.roles[0], "user");
                        
                            user.update({realname: "JS SDK", roles: ["admin", "user"]}, done);
                        },
                        function(user, done) {
                            test.ok(user);
                            test.strictEqual(user.properties().content.realname, "JS SDK");
                            test.strictEqual(user.properties().content.roles.length, 2);
                            test.strictEqual(user.properties().content.roles[0], "admin");
                            test.strictEqual(user.properties().content.roles[1], "user");
                            
                            user.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            },
            
            "Callback#delete test users": function(test) {
                var users = this.service.users();
                users.refresh(function(err, users) {
                    var userList = users.list();
                    
                    Async.parallelEach(
                        userList,
                        function(user, idx, callback) {
                            if (utils.startsWith(user.properties().name, "jssdk_")) {
                                user.remove(callback);
                            }
                            else {
                                callback();
                            }
                        }, function(err) {
                            test.ok(!err);
                            test.done();
                        }
                    );
                });
            }
        },
        
        "View Tests": {
            setUp: function(done) {
                this.service = svc;
                done();
            },
            
            "Callback#List views": function(test) {
                var service = this.service;
                
                service.views({owner: "admin", app: "search"}).refresh(function(err, views) {
                    test.ok(!err);
                    test.ok(views);
                    
                    var viewsList = views.list();
                    test.ok(viewsList);
                    test.ok(viewsList.length > 0);
                    
                    for(var i = 0; i < viewsList.length; i++) {
                        test.ok(viewsList[i]);
                    }
                    
                    test.done();
                });
            },
            
            "Callback#Create + update + delete view": function(test) {
                var service = this.service;
                var name = "jssdk_testview";
                var originalData = "<view/>";
                var newData = "<view isVisible='false'></view>";
                
                Async.chain([
                        function(done) {
                            service.views({owner: "admin", app: "new_english"}).create({name: name, "eai:data": originalData}, done);
                        },
                        function(view, done) {
                            test.ok(view);
                            
                            test.strictEqual(view.properties().name, name);
                            test.strictEqual(view.properties().content["eai:data"], originalData);
                            
                            view.update({"eai:data": newData}, done);
                        },
                        function(view, done) {
                            test.ok(view);
                            test.strictEqual(view.properties().content["eai:data"], newData);
                            
                            view.remove(done);
                        }
                    ],
                    function(err) {
                        test.ok(!err);
                        test.done();
                    }
                );
            }
        }
    };

};

if (module === require.main) {
    var splunkjs    = require('../splunk');
    var options     = require('../internal/cmdline');
    var test        = require('../contrib/nodeunit/test_reporter');
    
    var parser = options.create();
    var cmdline = parser.parse(process.argv);
        
    // If there is no command line, we should return
    if (!cmdline) {
        throw new Error("Error in parsing command line parameters");
    }
    
    var svc = new splunkjs.Service({ 
        scheme: cmdline.opts.scheme,
        host: cmdline.opts.host,
        port: cmdline.opts.port,
        username: cmdline.opts.username,
        password: cmdline.opts.password
    });
    
    var suite = exports.setup(svc);
    
    svc.login(function(err, success) {
        if (err || !success) {
            throw new Error("Login failed - not running tests", err || "");
        }
        test.run([{"Tests": suite}]);
    });
}