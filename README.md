# cfn-resolver-cli

[![Build Status](https://travis-ci.com/robessog/cfn-resolver-cli.svg?branch=master)](https://travis-ci.com/robessog/cfn-resolver-cli)
[![codecov](https://codecov.io/gh/robessog/cfn-resolver-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/robessog/cfn-resolver-cli)
![depend bot](https://badgen.net/dependabot/robessog/cfn-resolver-lib?icon=dependabot)
[![npm version](https://badge.fury.io/js/cfn-resolver-cli.svg)](https://badge.fury.io/js/cfn-resolver-cli)

NodeJS CLI that resolves and evaluates values in [AWS CloudFormation](https://aws.amazon.com/cloudformation/) templates based on the provided stack parameters and produces the resolved templates in YAML and JSON.

Did you ever had to debug what's wrong with your AWS CloudFormation template and why your stack deployment fails? Your YAML/JSON could contain some logic with all kinds of nested [intrinsic functions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html) and CFN [pseudo parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html) and sometimes this can get even more complex when you use a tool (e.g. [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html)) that generates the file for you.

If you have more than couple of these in your templates it is quite time consuming to figure out which exactly caused the deployment to fail. This simple tool ([cfn-resolver-lib]((https://www.npmjs.com/package/cfn-resolver-lib)) and [cfn-resolver-cli]((https://www.npmjs.com/package/cfn-resolver-cli))) tries to mitigate the issue by evaluating these logic and provide the final exact values that will be used in deployment time.

## Example
### Input
Your CloudFormation template:
``` yaml
Mappings:
  FooSrvS3ReaderUserIdMap:
    "us-east-1":
      UserName: "s3_reader_new"
    "us-west-2":
      UserName: "s3_reader"
Resources:
  HelloBucket:
    Properties:
      BucketName: "hello-cfn-resolver" # has to be globally unique, calculation is removed for clearity
    Type: "AWS::S3::Bucket"
  FooSrvBucketPolicy":
    Type: "AWS::S3::BucketPolicy"
    Properties:
      Bucket:
        Ref: HelloBucket
      PolicyDocument:
        Statement:
        - Action": "s3:GetObject*"
          Effect": Allow
          Principal:
            AWS:
              "Fn::Join":
              - ""
              - - "arn:"
              - "Ref": "AWS::Partition"
              - ":iam::"
              - "AWS::AccountId"
              - ":user/"
              - - "Fn::FindInMap":
                  - "FooSrvS3ReaderUserIdMap"
                  - "Ref": "AWS::Region"
                  - "UserName"
          Resource:
            "Fn::Join":
            - ""
            - - "Fn::GetAtt":
                - HelloBucket
                - Arn
              - "/*"
```

Define stack parameters: (e.g. `prod-us-west-2-params.json`)
```json
{
    "RefResolvers":
    {
        "AWS::Region": "us-west-2",
        "AWS::Partition": "aws",
        "AWS::AccountId": "000000111111",
        "Stage": "prod",
        "AWS::StackId": "MyEvaluatedStackUsWest2"
    }
}

```
### Output
Resolved CloudFormation template

``` yaml
  Principal:
    AWS: "arn:aws:iam::000000111111:user/s3_reader"
    Resource: "arn:aws:s3:::hello-cfn-resolver/*"
```

[cfn-resolver](https://www.npmjs.com/package/cfn-resolver-cli) can help you
* understand your CFN template better
* troubleshoot CloudFormation deployment issues faster
* secure your IaC with unit tests that assert on exact values before actually deploying anything
  * e.g. your unit test now can assert that the `s3_reader` IAM user has access to `hello-cfn-resolver` S3 bucket in `us-west-2` region in your `prod` stack.

## Installation

```
npm i -g cfn-resolver-cli
```
## How to use? 
```
cfn-resolver -i "./template.yml" -p "./params/**" -o "./resolved"
```

```
Options:
  --input, -i    provide a path to input template file (YAML or JSON)
  --params, -p   provide the stack parameters (can be a glob with * or **)
  --output, -o   output directory (if not provided it will be the same as the input file)
  
  --verbose, -v  Run with verbose logging                              [boolean]
  --help         Show help                                             [boolean]
  --version      Show version number                                   [boolean]
```

## Extensibility & Customization
You can pass additional resolver maps in the parameters file, just like `RefResolvers` to customize or **override** the built-in behaviour.

### Fn::GetAtt resolution
By default the tool tries to resolve the attributes of resources that are defined within the template itself, but you have the opportunity to override the behaviour for specific cases.
Just define the Fn::GetAtt resolver map for custom attribute resolution:

```json
{
    "Fn::GetAttResolvers": {
      "MyResourceLogicalId1": {
        "AttribeteKey1": "TheOverridenAttributeValue"
      }
  }
}
```

#### ARN resolution
With `Fn::GetAtt` you can refer to ARN of an other resource defined in the template.
The tool supports ARN resolution for some of the most common AWS CloudFormation resource types (Lambda function, SQS queue, SNS topic, S3 bucket, DyanmoDB Table, etc), but user can provide additional ARN shemas in the parameters file:

```json
{ 
  "ArnSchemas": {
    "AWS::DynamoDB::Table": "arn:${Partition}:dynamodb:${Region}:${Account}:table/${TableName}"
  }
}

```
The `${Partition}`, `${Region}` and `${Region}` placeholders will be resolved by using the stack parameters. The last placeholder of the arn schema (in the above example `${TableName}`) will be resolved from the attribute from the resource (if both the resource and its attribute can be found in the template).


### Fn::ImportValue resolvers
Define your Fn::ImportValue resolvers in the parameters file as the following:
```json
{ 
  "Fn::ImportValueResolvers": {
    "OtherStacksExportedKey1": "MyFakeImportedValue1"
  }
}
```

## Supported Features

* [Condition Functions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html)
  * [Fn::And](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and)
  * [Fn::Equals](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals)
  * [Fn::If](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if)
  * [Fn::Not](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not)
  * [Fn::Or](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or)
* [Fn::FindInMap](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html)
* [Fn::GetAtt](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html)
* [Fn::GetAZs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html)
* [Fn::Join](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html)
* [Fn::Select](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html)
* [Fn::Split](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html)
* [Fn::Sub](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html) (at the moment only key-value map subtitution is supported)
* [Fn::ImportValue](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html)
* [Ref](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html)


### Unsported Features
* [Fn::Transform](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-transform.html)

## Roadmap
* Enchance [Fn::Sub](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html) to work with template parameter names, resource logical IDs, resource attributes
* Support [Fn::Base64](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html)
* Support [Fn::Cidr](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html)
* Add linter/debugging features by identified valudation errors and warnings found during template evaluation (e.g. like [cfn-lint](https://www.npmjs.com/package/cfn-lint))

## Contribution
Feel free to implement any missing features or fix bugs. In any case don't forget to add unit tests.
