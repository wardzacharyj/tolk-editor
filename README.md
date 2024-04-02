## Tolk Editor

A vs-code extension that allows users to configure an exceutable and required arguements for reading, parsing, and finally displaying binary files in a human readable read-only format.

## Features
Tolk uses the same editor built into vs code ([monaco-editor](https://github.com/microsoft/monaco-editor)).

Because `monaco-editor` supports syntax highlighting across multiple main-stream languages by default, tolk can forward any associations it finds for a binary file extension from the user's settings. 

In the example below, when tolk converts a `*.bson` file, it will forward the `json` property to the monaco editor for syntax-highlighting. Note binary file extensions that are unknown to the user or monaco can still be viewed in the tolk editor, but will not have syntax highlighting.

##### .vscode/settings.json
```json
    "files.associations": {
        "*.bson": "json", 
    }
```

## Workspace Settings

Below are the required and optional settings for the tolk-editor

### Required
At a minimum the extension needs to know what exectuable it can use to provide the human readable view of the binary file.

Currently the extension only supports executables that print their converted contents to stdout.

##### Example

```json
{
    "tolkEditor": {
        "executablePath": "C:\\MyBinaryUtil.exe"
    },
}
```
```
~/your_project
$ C:\\MyBinaryUtil.exe the_file_being_opened.bson
{
    example: {
        "data": "Data contents..."
    }
}
```
With the settings above, if a user decides to open a binary file with the tolk editor. The executable will be used in the background to parse and provide the read-only view of the binary file


### Optional
If the executable being used requires additional flags or arguments before or after the binary filename you can specify both `executableArgs` and `uriSymbol` to control what command is ultimately used.
```json
{
    "tolkEditor": {
        "executablePath": "C:\\MyBinaryUtil.exe",
        "executableArgs": "-i ${INPUT_FILE} --to-console",
        "uriSymbol": "${INPUT_FILE}"
    },
}
```

**Enjoy!**
