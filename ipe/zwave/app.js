var ZWave = require('openzwave-shared');
var request = require('request')
var config = require('config');
var zwave = new ZWave();

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();

var nodes = [];
var cseurl = "http://"+config.cse.ip+":"+config.cse.port+"/~/"+config.cse.id+"/"+config.cse.name

var powerSwitchNodeId;
app.use(bodyParser.json());


app.listen(4000, function () {
	console.log('Zwave IPE listening on port 4000');
});

app.post('/', function (req, res) {
	console.log("\n◀◀◀◀◀")
	console.log(req.body);
	var content = req.body["m2m:sgn"].nev.rep["m2m:cin"].con;
    console.log("Received content: "+content);
    if(content=="1"){
        zwave.setValue(powerSwitchNodeId,37,1,0,true);   
     }
    if(content=="0"){

        zwave.setValue(powerSwitchNodeId,37,1,0,false);
    }
    res.sendStatus(200);

});

zwave.on('driver ready', function(homeid) {
    console.log('scanning homeid=0x%s...', homeid.toString(16));
});

zwave.on('driver failed', function() {
    console.log('failed to start driver');
    zwave.disconnect();
    process.exit();
});

zwave.on('node added', function(nodeid) {
    nodes[nodeid] = {
        manufacturer: '',
        manufacturerid: '',
        product: '',
        producttype: '',
        productid: '',
        type: '',
        name: '',
        loc: '',
        classes: {},
        ready: false,
    };
});

zwave.on('value added', function(nodeid, comclass, valueId) {
    if (!nodes[nodeid]['classes'][comclass])
        nodes[nodeid]['classes'][comclass] = {};
    nodes[nodeid]['classes'][comclass][valueId.index] = valueId;
});

zwave.on('value changed', function(nodeid, comclass, value) {
    if (nodes[nodeid]['ready']) {
        console.log('node%d: changed: %d:%s:%s->%s', nodeid, comclass,
                value['label'],
                nodes[nodeid]['classes'][comclass][value.index]['value'],
                value['value']);
      
                console.log(nodes[nodeid]['type']);
                console.log(value['label']);

                if(nodes[nodeid]['type']=="On/Off Power Switch"){
                    aeName="powerSwitch"
                    if(value['label']=="Switch"){
                        if(value['value']==true){
                            createContentInstance("Cae-"+aeName,aeName,"status",1)
                        }
                        if(value['value']==false){
                            createContentInstance("Cae-"+aeName,aeName,"status",0)
                        }
                    }

                    if(value['label']=="Power"){
                        createContentInstance("Cae-"+aeName,aeName,"power",value['value'])
                    }
                }
            
                if(nodes[nodeid]['type']=="Home Security Sensor"){
                    aeName="motionSensor"
                    if(value['label']=="Burglar"){
                        if(value['value']==8){
                            createContentInstance("Cae-"+aeName,aeName,"status",1)
                        }
                        if(value['value']==0){
                            createContentInstance("Cae-"+aeName,aeName,"status",0)
                        }
                    }
                }
                if(nodes[nodeid]['type']=="Access Control Sensor"){
                    aeName="doorSensor"
                    if(value['label']=="Access Control"){
                        if(value['value']==23){
                            createContentInstance("Cae-"+aeName,aeName,"status",0)
                        }
                        if(value['value']==22){
                            createContentInstance("Cae-"+aeName,aeName,"status",1)
                        }
                    }
                }
    }
    nodes[nodeid]['classes'][comclass][value.index] = value;
});

zwave.on('value removed', function(nodeid, comclass, index) {
    if (nodes[nodeid]['classes'][comclass] &&
        nodes[nodeid]['classes'][comclass][index])
        delete nodes[nodeid]['classes'][comclass][index];
});

zwave.on('node ready', function(nodeid, nodeinfo) {
    nodes[nodeid]['manufacturer'] = nodeinfo.manufacturer;
    nodes[nodeid]['manufacturerid'] = nodeinfo.manufacturerid;
    nodes[nodeid]['product'] = nodeinfo.product;
    nodes[nodeid]['producttype'] = nodeinfo.producttype;
    nodes[nodeid]['productid'] = nodeinfo.productid;
    nodes[nodeid]['type'] = nodeinfo.type;
    nodes[nodeid]['name'] = nodeinfo.name;
    nodes[nodeid]['loc'] = nodeinfo.loc;
    nodes[nodeid]['ready'] = true;

    if(nodes[nodeid]['type']=="On/Off Power Switch"){
        var aeName="powerSwitch"
        powerSwitchNodeId=nodeid;
        createAE("Cae-"+aeName,aeName,"status");
        createAE("Cae-"+aeName,aeName,"power");
        createAE("Cae-"+aeName,aeName,"command","http://127.0.0.1:4000/");
    }

    if(nodes[nodeid]['type']=="Home Security Sensor"){
        var aeName="motionSensor"
        createAE("Cae-"+aeName,aeName,"status");
    }
    if(nodes[nodeid]['type']=="Access Control Sensor"){
        var aeName="doorSensor"
        createAE("Cae-"+aeName,aeName,"status");
    }
    
    console.log('node%d: %s, %s', nodeid,
            nodeinfo.manufacturer ? nodeinfo.manufacturer
                      : 'id=' + nodeinfo.manufacturerid,
            nodeinfo.product ? nodeinfo.product
                     : 'product=' + nodeinfo.productid +
                       ', type=' + nodeinfo.producttype);
    console.log('node%d: name="%s", type="%s", location="%s"', nodeid,
            nodeinfo.name,
            nodeinfo.type,
            nodeinfo.loc);

            
    for (comclass in nodes[nodeid]['classes']) {
      console.log('node%d: class %d', nodeid, comclass);
      switch (comclass) {
        case 0x25: // COMMAND_CLASS_SWITCH_BINARY
        case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
          for (valueId in valueIds) {
            zwave.enablePoll(valueId);
            break;
          }
          console.log('node%d:   %s=%s', nodeid, values[idx]['label'], values[idx]['value']);
      }
      //createContainer(values[idx]['label']);
    }

});

zwave.on('notification', function(nodeid, notif) {
    switch (notif) {
    case 0:
        console.log('node%d: message complete', nodeid);
        break;
    case 1:
        console.log('node%d: timeout', nodeid);
        break;
    case 2:
        console.log('node%d: nop', nodeid);
        break;
    case 3:
        console.log('node%d: node awake', nodeid);
        break;
    case 4:
        console.log('node%d: node sleep', nodeid);
        break;
    case 5:
        console.log('node%d: node dead', nodeid);
        break;
    case 6:
        console.log('node%d: node alive', nodeid);
        break;
        }
});

zwave.on('scan complete', function() {
    console.log('====> scan complete, hit ^C to finish.');
    // set dimmer node 5 to 50%
    //zwave.setValue(5,38,1,0,50);
    //zwave.setValue( {node_id:5, class_id: 38, instance:1, index:0}, 50);
    // Add a new device to the ZWave controller
    if (zwave.hasOwnProperty('beginControllerCommand')) {
      // using legacy mode (OpenZWave version < 1.3) - no security
      zwave.beginControllerCommand('AddDevice', true);
    } else {
      // using new security API
      // set this to 'true' for secure devices eg. door locks
      zwave.addNode(false);
    }
});

zwave.on('controller command', function(r,s) {
    console.log('controller commmand feedback: r=%d, s=%d',r,s);
});

zwave.connect(config.serial.port);

process.on('SIGINT', function() {
    console.log('disconnecting...');
    zwave.disconnect(config.serial.port);
    process.exit();
});


function createAE(aeId,aeName,cntName,nu){
	console.log("\n▶▶▶▶▶");
	var originator = aeId;
	var method = "POST";
	var uri= cseurl;
	var resourceType=2;
	var requestId = "123456";
	var representation = {
		"m2m:ae":{
			"rn":aeName,			
            "api":"app.company.com",
            "rr":"false"
		}
	};

	console.log(method+" "+uri);
	console.log(representation);

	var options = {
		uri: uri,
		method: method,
		headers: {
			"X-M2M-Origin": originator,
			"X-M2M-RI": requestId,
			"Content-Type": "application/json;ty="+resourceType
		},
		json: representation
	};

	request(options, function (error, response, body) {
		console.log("◀◀◀◀◀");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
			createContainer(aeId,aeName,cntName,nu);
		}
	});
}

function createContainer(aeId, aeName, cntName,nu){
	console.log("\n▶▶▶▶▶");
	var originator = aeId;
	var method = "POST";
	var uri= cseurl+"/"+aeName;
	var resourceType=3;
	var requestId = "123456";
	var representation = {
		"m2m:cnt":{
			"rn":cntName,
			"mni":100		

		}
	};

	console.log(method+" "+uri);
	console.log(representation);

	var options = {
		uri: uri,
		method: method,
		headers: {
			"X-M2M-Origin": originator,
			"X-M2M-RI": requestId,
			"Content-Type": "application/json;ty="+resourceType
		},
		json: representation
	};

	request(options, function (error, response, body) {
		console.log("◀◀◀◀◀");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
            console.log(body);
            console.log(nu)
            if(nu!=undefined ){
                createSubscription(aeId,aeName,cntName,nu);
            }
		}
	});
}

function createContentInstance(aeId,aeName,cntName,value){
	console.log("\n▶▶▶▶▶");
	var originator = aeId;
	var method = "POST";
	var uri= cseurl+"/"+aeName+"/"+cntName;
	var resourceType=4;
	var requestId = "123456";
	var representation = {
		"m2m:cin":{
			"con": value
		}
	};

	console.log(method+" "+uri);
	console.log(representation);

	var options = {
		uri: uri,
		method: method,
		headers: {
			"X-M2M-Origin": originator,
			"X-M2M-RI": requestId,
			"Content-Type": "application/json;ty="+resourceType
		},
		json: representation
	};

	request(options, function (error, response, body) {
		console.log("◀◀◀◀◀");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		}
	});
}


function createSubscription(aeId,aeName,cntName,nu){
	console.log("\n▶▶▶▶▶");
	var originator = aeId;
	var method = "POST";
	var uri= cseurl+"/"+aeName+"/"+cntName;
	var resourceType=23;
	var requestId = "123456";
	var representation = {
		"m2m:sub": {
			"rn": "sub",
			"nu": [nu],
			"nct": 2,
			"enc": {
				"net": 3
			}
		}
	};

	console.log(method+" "+uri);
	console.log(representation);

	var options = {
		uri: uri,
		method: method,
		headers: {
			"X-M2M-Origin": originator,
			"X-M2M-RI": requestId,
			"Content-Type": "application/json;ty="+resourceType
		},
		json: representation
	};

	request(options, function (error, response, body) {
		console.log("◀◀◀◀◀");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		}
	});
}
