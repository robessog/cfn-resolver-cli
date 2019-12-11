const NodeEvaluator = require('cfn-resolver-lib');

const yargs = require('yargs');
const fs = require('fs');
const jsYaml = require('js-yaml');
const path = require('path');
const glob = require('glob');
const fsExtra = require('fs-extra');

const argv = yargs
  .option('input', {
    alias: 'i',
    describe: 'provide a path to input file',
  })
  .option('params', {
    alias: 'p',
    describe: 'provide a stack parameters'
  })
  .option('output', {
    alias: 'o',
    describe: 'output file'
  }).option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  })
  .help()
  .argv

const inputContent = fs.readFileSync(argv.input, 'utf8');
let srcObj;


if([".yaml", ".yml"].includes(path.extname(argv.input).toLocaleLowerCase())){
    srcObj = jsYaml.safeLoad(inputContent);
} else {
    srcObj = JSON.parse(inputContent);
}

console.log("Params glob: " + argv.params);

glob(argv.params, {nodir: true}, (err, paramFiles) => {
  paramFiles.forEach((file) => {
    console.log("Found param file: " + file);
    const paramsContent = fs.readFileSync(file);
    const params = JSON.parse(paramsContent);

    const nodeEval = new NodeEvaluator(srcObj, params, argv.verbose);
    const evaluatedObj = nodeEval.evaluateNodes();

    const outBaseDir = argv.output || path.dirname(argv.input)
    const outFilePath = path.join(outBaseDir, path.basename(argv.input, path.extname(argv.input)) + "-resolved-" + path.basename(file, path.extname(file)));


    try {
      fsExtra.outputFileSync(outFilePath + ".json", JSON.stringify(evaluatedObj, null, 2))
      let yamlStr = jsYaml.safeDump(evaluatedObj);
      fsExtra.outputFileSync(outFilePath + '.yaml', yamlStr, 'utf8');

      console.log("Output written: " + outFilePath + ".yaml");
      console.log("Output written: " + outFilePath + ".json");
    } catch(e) {
      console.log("Failed to output file: " + outFilePath);
      console.error(e);
    }
  });
  console.log("Run completed.")
})


module.exports = NodeEvaluator;