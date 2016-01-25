// v0.3   : ajout support plugin Logitech Harmony
// v0.2.1

exports.action = function(data, callback, config) 
{
	var xmldoc = require('./lib/xmldoc');
	config = config.modules.homecenter;
	var actionList 		= ['turnOff', 'turnOn', 'setValue', 'getValue'];
	var api_devices 	= '/api/devices/';
	var api_weather 	= '/api/weather/';
	var action_path 	= '/action/';
	var http 			= 'http://';
	var https 			= 'https://';
	var url 			= '';
	var json_body_start	= '{"args": [';
	var json_body_null 	= 'null';
	var json_body_end 	= ']}';
	var json_body 		= '';
	
	/** Module access **/
	var fs = require('fs');
	var xmlFile = fs.readFileSync(__dirname + '\\devices.xml');
	var file = new xmldoc.XmlDocument(xmlFile);
	var module = file.childWithAttribute('name', data.module);

	if (!config.url) {
		console.log("Missing Home Center url");
		return;
	}
	// 
	// Devices action
	// 
	var reqmethod = 'POST';
	console.log("INFO || Action = " + data.actionModule);
	switch(data.actionModule) {
		case 'turnOn' 	: 
		case 'turnOff' 	:
		case 'setValue'	:
			url = http + config.url + ":" + config.port + api_devices + module.attr.id + action_path;
			console.log("INFO || Type = " + module.attr.type);
			switch(module.attr.type) {
				case 'com.fibaro.multilevelSwitch' :
					if (data.setValue) {
						console.log("INFO || Dimmer set to " + data.setValue);
						url += 'setValue';
						json_body = json_body_start + data.setValue + json_body_end;
						break;
					} else {
						console.log("INFO || Dimmer value not set : turning ON or OFF");
						// Switching to next case
					}
				case 'com.fibaro.binarySwitch' :
					url += data.actionModule;
					json_body = json_body_start + json_body_null + json_body_end;
					break;
				case 'com.fibaro.logitechHarmonyActivity' :
					switch (data.actionModule) { 
						case "turnOn":
							url += 'changeActivityState';
							break;
						case "turnOff":
							url += 'changeActivityState';
							break;
						default :
					}
					break;
				case 'virtual_device' :
					if (data.setValue) {
						 url += 'setSlider';
						json_body = json_body_start + module.attr.slider +"," 
								  + data.setValue + json_body_end;
					}
					else {
						switch (data.actionModule) { 
							case "turnOn":
								url += 'pressButton';
								json_body = json_body_start + module.attr.buttonOn + json_body_end;
								break;
							case "turnOff":
								url += 'pressButton';
								json_body = json_body_start + module.attr.buttonOff + json_body_end;
								break;
							case "setValue":
								url += 'pressButton';
								json_body = json_body_start + module.attr.buttonMy + json_body_end;
							default :
								console.log("WARN || You shouldn't have reached this point !");
								console.log("WARN || => Please verify 'homecenter.js' file !");
						}
					}
					break;
				case 'com.fibaro.lightSensor' 		:
				case 'com.fibaro.temperatureSensor' :
				case 'com.fibaro.humiditySensor' 	:
				case 'com.fibaro.seismometer' 		:
				case 'com.fibaro.multilevelSensor' 	: 
				case 'weather' 						:
					console.log("WARN || Device " + module.attr.type + " not designed for POST method");
					callback({'tts': "Désolée, les modules " + module.attr.type + " n'acceptent pas ce type de commande"});
					break;
				default :
					console.log("WARN || Unknown device '" + module.attr.type + "'!")
					console.log("WARN || Check your 'devices.xml' file");
					callback({'tts': "Désolée, le type de module " + module.attr.type + "m'est inconnu"});
			}
			break;
		case 'getValue' :
			reqmethod='GET';
			json_body='';
			console.log("INFO || Type = " + module.attr.type);
			switch(module.attr.type) {
				case 'com.fibaro.multilevelSwitch' 	:
				case 'com.fibaro.binarySwitch' 		:
				case 'com.fibaro.logitechHarmonyActivity' :
				case 'com.fibaro.lightSensor' 		:
				case 'com.fibaro.temperatureSensor' :
				case 'com.fibaro.humiditySensor' 	:
				case 'com.fibaro.seismometer' 		:
				case 'com.fibaro.multilevelSensor' 	: 
					url = http + config.url + ":" + config.port + api_devices + module.attr.id;
					break;
				case 'weather' : // Weather action
					url = http + config.url + ":" + config.port + api_weather;
					break;
				case 'virtual_device' :
					url = http + config.url + ":" + config.port + api_devices + module.attr.id;
					break;
				default : // Scenario action
					console.log("WARN || Unknown device '" + module.attr.type + "'!")
					console.log("WARN || Check your 'devices.xml' file");
					callback({'tts': "Désolée, le type de module " + module.attr.type + "m'est inconnu"});
			}	
			break;
		default :
			console.log("WARN || Unknown command '" + data.actionModule + "'!");
			console.log("WARN || Check your 'homecenter.xml' file");
			callback({'tts': "Désolée, la commande " + data.actionModule + "m'est inconnue"});
	}
	
	console.log("INFO || Sending request to: ");
	console.log("INFO || " + url);

	//	
	// URL
	//

	// Send Request
	var request = require('request');
	var options = {
		method: reqmethod,
		uri: url,
		body: json_body,
		headers: {
    		'Authorization': 'Basic ' + new Buffer(config.username+":"+config.password).toString('base64')
		}
	};
	var tts_sensor_value = "";
	request(options, function(error, response, body) {
    	if (!error && (response.statusCode == 200) || (response.statusCode == 202)) {
        	body=JSON.parse(body);
     	}
     	else {
     		console.log("ERRO || Error with url: " + url);
     	}
		var tts = data.ttsAction + " " + module.attr.tts;
		
		console.log("INFO || Id = " + module.attr.id);
		console.log("INFO || Name = " + module.attr.name);
		if (data.actionModule == 'getValue') {
			switch(module.attr.type) {
				case 'HC_user':
					break;
				case 'weather':
					var weather_humidity 	= parseFloat(body.Humidity).toString().replace("."," virgule ");
					var weather_wind 		= parseFloat(body.Wind).toString().replace("."," virgule ");
					var weather_temperature = parseFloat(body.Temperature).toString().replace("."," virgule ");
						weather_temperature = weather_temperature.replace("-"," moins ")
					tts += "La température est de " 	+ weather_temperature + " degrés. ";
					if (parseFloat(body.Temperature) < 0) tts += "Attention au risque de gel. ";
					tts += "L'hygrométrie est de " 		+ weather_humidity + " pour cent. ";
					tts += "La vitesse du vent est de "	+ weather_wind + " kilomètres heure. ";
					break;
				case 'iOS_device':
					break;
				case 'virtual_device':
					switch (parseFloat(body.properties['ui.VoletDIM.value'])) { 
						case 0   : tts += " est ouvert"; break;
						case 99  : 
						case 100 : tts += " est fermé"; break;
						default  : tts += " est fermé à " + body.properties.value + " pour cent";
					}
					break;
				case 'com.fibaro.logitechHarmonyActivity' :
					switch (body.properties['ui.activityCurrentStateValueLabel.caption']) {
						case 'Activity OFF' :
							tts += " est arrêté.";
							break;
						case 'Running' :
							tts += " est en marche.";
							break;
						default :
							tts += " est dans un état inconnu.";
					}
					break;
				case 'com.fibaro.multilevelSwitch':
					switch (parseFloat(body.properties.value)) { 
						case 0   : tts += " est éteinte"; break;
						case 99  : 
						case 100 : tts += " est allumée"; break;
						default  : tts += " est allumée à " + body.properties.value + " pour cent";
					}
					break;
				case 'com.fibaro.binarySwitch':
					switch (body.properties.value) {
						case 'true' : tts += " est allumée"; break;
						case 'false': tts += " est éteinte"; break;
						default     : tts += " est dans un état inconnu";
					}
					break;
				case 'com.fibaro.motionSensor'		:
				case 'com.fibaro.FGFS101'			:
				case 'com.fibaro.FGSS001'			:
				case 'com.fibaro.heatDetector'		:
				case 'com.fibaro.doorSensor'		:
					break;
    			case 'com.fibaro.temperatureSensor'	:
    			case 'com.fibaro.humiditySensor'	:
        		case 'com.fibaro.lightSensor'		:
	        	case 'com.fibaro.seismometer'		:
    	    	case 'com.fibaro.multilevelSensor'	:
					tts_sensor_value = parseFloat(body.properties.value).toString().replace("."," virgule ");
					break;
	    		default:
					console.log("WARN || unknown sensor '" + module.attr.type + "'!");
					console.log("WARN || Check your 'device.xml' file");
			}
		} else {tts_sensor_value = "";}
		
		tts = tts.replace('%s', tts_sensor_value);
		console.log(tts);
		if (data.ttsDim){
			tts += " " + data.ttsDim;
		}
		// Callback with TTS
		callback({'tts': tts});
	});
}
