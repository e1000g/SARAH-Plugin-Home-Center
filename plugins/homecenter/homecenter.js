/*
Version 0.3.3 (26/01/2016)
— changes in XML parameters
Version 0.3.2 (26/01/2016)
— forced turnOn if setValue undefined
— modified console logs
— code cleaning
Version 0.3.1 (25/01/2016)
— bugfix : replaced body.properties.value with body.properties['ui.VoletDIM.value'] in virtual_device
Version 0.3.0 (25/01/2016)
— support du plugin Logitech Harmony
Version 0.2.1 (24/01/2016)
— support des modules virtuels : sliders
Version 0.2.0 (23/01/2016)
— support des modules virtuels : boutons
Version 0.1.2 (22/01/2016)
— support du module météo
Version 0.1.1 (21/01/2016)
— support des sondes
Version 0.1.0 (20/01/2016)
— support des binarySwitch multilevelSwitch
*/

exports.action = function(data, callback, config) 
{
	var xmldoc = require('./lib/xmldoc');
	config = config.modules.homecenter;
	var actionList 		= ['turnOff', 'turnOn', 'setValue', 'getValue'];
	var api_devices 	= '/api/devices/';
	var api_weather 	= '/api/weather/';
	var action_path 	= '/action/';
	var http 			= 'http://';
	var url 			= '';
	var json_body_start	= '{"args": [';
	var json_body_null 	= 'null';
	var json_body_end 	= ']}';
	var json_body_value = '';
	var json_body 		= '';
	
	/** Module access **/
	var fs = require('fs');
	var xmlFile = fs.readFileSync(__dirname + '\\devices.xml');
	var file = new xmldoc.XmlDocument(xmlFile);
	var module = file.childWithAttribute('name', data.module);

	if (!config.url) {
		console.log("|HC|Error: Missing Home Center url");
		return;
	}
	// 
	// Devices action : construct URL
	// 
	var reqmethod = 'POST';
	console.log("|HC|Info.: Action = " + data.command);
	switch(data.command) {
	case 'turnOn' 	: 
	case 'turnOff' 	:
	case 'setValue'	:
		url = http + config.url + ":" + config.port + api_devices + module.attr.id + action_path;
		console.log("|HC|Info.: Type = " + module.attr.type);
		switch(module.attr.type) {
		case 'com.fibaro.multilevelSwitch' :
			if (data.dimValue) {
				console.log("|HC|Info.: Dimmer set to " + data.dimValue);
				url += 'setValue';
				json_body_value = data.dimValue;
				break;
			} else {
				console.log("|HC|Info.: Dimmer value not set : turning ON or OFF");
				// Switching to next case
			}
		case 'com.fibaro.binarySwitch' :
			if (data.command == 'setValue') data.command = 'turnOn';
			url += data.command;
			json_body_value = json_body_null;
			break;
		case 'com.fibaro.logitechHarmonyActivity' :
			switch (data.command) { 
			case 'turnOn':
				url += 'changeActivityState';
				break;
			case 'turnOff':
				url += 'changeActivityState';
				break;
			default :
				console.log("|HC|Warn.: You shouldn't have reached this point !");
				console.log("|HC|Warn.: => Please verify 'homecenter.js' file !");
				return callback({'tts': "Désolée, erreur dans le traitement de la requête pour le module de type " + module.attr.type});
			}
			break;
		case 'virtual_device' :
			if (data.dimValue) {
				 url += 'setSlider';
				json_body_value = module.attr.slider + "," + data.dimValue;
			}
			else {
				switch (data.command) { 
				case 'turnOn':
					url += 'pressButton';
					json_body_value = module.attr.buttonOn;
					break;
				case 'turnOff':
					url += 'pressButton';
					json_body_value = module.attr.buttonOff;
					break;
				case 'setValue':
					url += 'pressButton';
					json_body_value = module.attr.buttonMy;
				default :
					console.log("|HC|Warn.: You shouldn't have reached this point !");
					console.log("|HC|Warn.: => Please verify 'homecenter.js' file !");
					return callback({'tts': "Désolée, erreur dans le traitement de la requête pour le module de type " + module.attr.type});
				}
			}
			break;
		case 'com.fibaro.lightSensor' 		:
		case 'com.fibaro.temperatureSensor' :
		case 'com.fibaro.humiditySensor' 	:
		case 'com.fibaro.seismometer' 		:
		case 'com.fibaro.multilevelSensor' 	: 
		case 'weather' 						:
			console.log("|HC|Warn.: Device " + module.attr.type + " not designed for POST method");
			return callback({'tts': "Désolée, les modules " + module.attr.type + " n'acceptent pas ce type de commande"});
			break;
		default :
			console.log("|HC|Warn.: Unknown device '" + module.attr.type + "'!")
			console.log("|HC|Warn.: Check your 'devices.xml' file");
			return callback({'tts': "Désolée, le type de module " + module.attr.type + "m'est inconnu"});
		}
		break;
	case 'getValue' :
		reqmethod='GET';
		json_body='';
		console.log("|HC|Info.: Type = " + module.attr.type);
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
		case 'HC_user':
		case 'iOS_device':
		case 'com.fibaro.motionSensor'		:
		case 'com.fibaro.FGMS001'			:
		case 'com.fibaro.FGFS101'			:
		case 'com.fibaro.FGSS001'			:
		case 'com.fibaro.heatDetector'		:
		case 'com.fibaro.doorSensor'		:
			console.log("|HC|Warn.: Module type '" + module.attr.type + "' not yet implemented.");
			return callback({'tts': "Désolée, les modules de type " + module.attr.type + "ne sont pas encore implémentés."});
		default : // Scenario action
			console.log("|HC|Warn.: Unknown device '" + module.attr.type + "'!")
			console.log("|HC|Warn.: Check your 'devices.xml' file");
			return callback({'tts': "Désolée, le type de module " + module.attr.type + "m'est inconnu"});
		}	
		break;
	case 'update':
		break;
	default :
		console.log("|HC|Warn.: Unknown command '" + data.command + "'!");
		console.log("|HC|Warn.: Check your 'homecenter.xml' file");
		return callback({'tts': "Désolée, la commande " + data.command + "m'est inconnue"});
	}
	
	console.log("|HC|Info.: Sending request to: ");
	console.log("|HC|Info.: " + url);
	json_body = json_body_start + json_body_value + json_body_end;

	//	
	// Send Request
	//

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
     		console.log("|HC|Error: Error with url: " + url);
     	}
		var tts = data.ttsCmd + " " + module.attr.tts;
		
		console.log("|HC|Info.: Id = " + module.attr.id);
		console.log("|HC|Info.: Name = " + module.attr.name);
	
	//
	// Parse JSON answer for GET method
	//
			
		switch (data.command) {
		case 'getValue' :
			switch(module.attr.type) {
			case 'HC_user':
			case 'iOS_device':
			case 'com.fibaro.motionSensor'		:
			case 'com.fibaro.FGMS001'			:
			case 'com.fibaro.FGFS101'			:
			case 'com.fibaro.FGSS001'			:
			case 'com.fibaro.heatDetector'		:
			case 'com.fibaro.doorSensor'		:
				console.log("|HC|Warn.: Module type '" + module.attr.type + "' not yet implemented.");
				return callback({'tts': "Désolée, les modules de type " + module.attr.type + "ne sont pas encore implémentés."});
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
			case 'virtual_device':
				switch (parseFloat(body.properties['ui.VoletDIM.value'])) { 
					case 0   : tts += " est ouvert"; break;
					case 99  : 
					case 100 : tts += " est fermé"; break;
					default  : tts += " est fermé à " + body.properties['ui.VoletDIM.value'] + " pour cent";
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
			case 'com.fibaro.temperatureSensor'	:
   			case 'com.fibaro.humiditySensor'	:
       		case 'com.fibaro.lightSensor'		:
        	case 'com.fibaro.seismometer'		:
   	    	case 'com.fibaro.multilevelSensor'	:
				tts_sensor_value = parseFloat(body.properties.value).toString().replace("."," virgule ");
				break;
	  		default:
				console.log("|HC|Warn.: Unknown sensor '" + module.attr.type + "'!");
				console.log("|HC|Warn.: Check your 'device.xml' file");
			}
			break;
		case 'update':

			break;
		default:
			tts_sensor_value = "";
		}
		
	//
	// tts
	//
		
		tts = tts.replace('%s', tts_sensor_value);
		if (data.ttsDim){
			tts += " " + data.ttsDim;
		}
		console.log("|HC|Speak: " + tts);
		// Callback with TTS
		callback({'tts': tts});
	});
}