var _ = require("underscore")._;
var fs = require('fs');
var temp = require('temp')
var execSync = require('execSync')

/**
	kNN implementation via WEKA
 */

var kNN = function(opts) {

	this.k = opts.k
	this.distanceFunction = opts.distanceFunction
	this.distanceWeightening = opts.distanceWeightening

	this.labels = []
	
	this.distancemap = { '1/d':'-I',
							'1-d':'-F',
							'No' :''}
}

kNN.prototype = {

	trainOnline: function(sample, labels) {
	},

	trainBatch : function(dataset) {
		this.dataset = dataset
	},

	classify: function(sample, explain) {

		this.learnFile = temp.openSync({prefix:"kNN-", suffix:".learn.arff"});
		this.testFile = temp.openSync({prefix:"kNN-", suffix:".test.arff"});

		if (!(this.distanceWeightening in this.distancemap))
		{
			console.error("distanceWeightening not in distancemap")
			process.exit(0)
		}

		this.writeData(this.dataset, 0, this.learnFile)

		var dataset = [{'input': sample, 'output': '?'}]
		this.writeData(dataset, 0, this.testFile)

		var command = "java weka.classifiers.lazy.IBk "+
		"-t " + this.learnFile.path + " -T " + this.testFile.path + " " + this.distancemap[this.distanceWeightening] + " -K 1 -W 0 "+
		"-A \"weka.core.neighboursearch.LinearNNSearch -A \\\"weka.core." + this.distanceFunction + " -R first-last\\\"\" -p 0"

		console.log(this.learnFile)
		console.log(this.testFile)
		console.log(command)

		result = execSync.exec(command)

		console.log(JSON.stringify(result, null, 4))

		var res = this.processResult(result)

		var score = (res['label'] == 1 ? 1*res['labelscore'] : (-1)*res['labelscore']);

		return score
	},

	processResult: function(result) {
		var output = result['stdout'].split("\n\n")[2].split("\n")[1].split(" ")
		var output = _.compact(output)
		_.each(output, function(value, key, list){ 
			output[key] = output[key].split(":")
		}, this)

		return {'label': output[2][1],
				'labelscore': output[3][0]}
	},
	/*0-train 1 set*/
	writeData: function(dataset, mode, filename) {

		var output = "@RELATION kNN\n\n"
			
		_.each(this.featureLookupTable['featureIndexToFeatureName'], function(value, key, list){ 
			output += "@ATTRIBUTE\t'" + value + "'\t" + "REAL\n"
		}, this)

		output += "@ATTRIBUTE\tclass\t{0,1}\n"
		output += "\n@DATA\n"


		_.each(dataset, function(value, key, list){ 
			value['input'] = this.complement(value['input'])
			// if (value['output'] != '?')
				output +=  value['input'].join(",") + "," + value['output'] + "\n"
			// else
				// output += "?," + value['input'].join(",") + "\n"
		}, this)
	
		fs.writeSync(filename.fd, output);
		fs.closeSync(filename.fd);
	},

	complement: function(input) {
		var len = this.featureLookupTable['featureIndexToFeatureName'].length
		_(len - input.length).times(function(n){
			input.push(0)
		})
		return input
	},

	getAllClasses: function() {
	},

	stringifyClass: function (aClass) {
		return (_(aClass).isString()? aClass: JSON.stringify(aClass));
	},

	toJSON : function() {
	},

	fromJSON : function(json) {
	},
	
	setFeatureLookupTable: function(featureLookupTable) {
		this.featureLookupTable = featureLookupTable
	},
}


module.exports = kNN;