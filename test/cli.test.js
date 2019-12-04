

const { execSync } = require('child_process');
const expect = require('chai').expect;

const executeCli = (templteStackName) => {
    const stack1TemplatePath = `./test/testData/${templteStackName}/template.yml`;
    const paramsPathGlob = `./test/testData/${templteStackName}/params/**`;
    const outputDir = `./test/out/${templteStackName}`;
    const cliCommand = `cfn-resolver -i ${stack1TemplatePath} -p "${paramsPathGlob}" -o ${outputDir}`;
    console.log("Executing CLI command: " + cliCommand);
    execSync(cliCommand);
}

const testTemplate = (templteStackName, paramsQaulifier) => {
    const fileName = `template-resolved-params-${paramsQaulifier}.json`;
    const outputContent = require(`./out/stack1/${fileName}`);
    const expectedContent = require(`./testData/${templteStackName}/expected/expected-${paramsQaulifier}.json`);

    expect(expectedContent).to.be.deep.equal(outputContent);
}

describe('CLI', () => {
    executeCli("stack1");

    it('resolve stack1 teamplate for us-east-1 Prod', () => {
        testTemplate("stack1", "us-east-1-prod")
    });

    it('resolve stack1 teamplate for us-east-1 Beta', () => {
        testTemplate("stack1", "us-east-1-beta")
    });

    it('resolve stack1 teamplate for us-west-2 Prod', () => {
        testTemplate("stack1", "us-west-2-prod")
    });
});