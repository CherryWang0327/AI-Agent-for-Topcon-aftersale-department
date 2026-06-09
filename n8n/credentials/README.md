# Credential Import Folder

By default, this public directory does not contain any real n8n credential JSON files.

There are only two intended ways to use this folder:

1. Without the private add-on package
   Manually create the five credentials by following `MetaAgents/n8n/credentials/credential-setup.md`, then run `MetaAgents/scripts/import-n8n-assets.ps1` to import the workflows.
2. With the private add-on package
   Copy the five credential `*.json` files from the private add-on package into this directory, then run `MetaAgents/scripts/import-n8n-assets.ps1`.

For the public delivery package, this folder should only contain this README file.
