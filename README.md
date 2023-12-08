# Als Resolver Tools

A set of tools aimed at making it easier to generate, and manage appsync resolvers.

Predominantly comprised of a bundler for managing out-of-band deploys of schemas, resolvers, data sources, and functions, and a tool to translate something more akin to a per-api-handler into the pipeline resolver architecture.

This repo has in it an example which is what I consider to be reasonable input code, and translates to a set of cdk constructs and code, then a sample-app which is used to verify the CDK code, and a sample-input which is used when running `npm run transform:sample` to verify the behavior.

While under active dev behavior is being tested predominantly by mutating and testing this sample-input, but I'll probably build some harnesses as I get further along to make it faster to iterate.

## TODO

* Not all resolvers are being found for some reason, My expression is coming out the other end.
* Need to actually generate resolvers
* Generate CDK code
* How do you reference or generate the datasources?
