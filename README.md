# Selfkey issuer service



## CLI

`./bin/issuer-cli --help`

```
issuer-cli <command>

Commands:
  issuer-cli get-whitelisted-did [did]  Checks if did is whitelisted
                                                                   [aliases: is]
  issuer-cli get-approved               print a list of all dids that were
                                        approved                    [aliases: a]
  issuer-cli get-whitelisted            print a list of all did's that were
                                        whitelisted                [aliases: wl]
  issuer-cli get-not-whitelisted        print a list of all did's that were
                                        approved but not whitelisted
                                                                  [aliases: nwl]
  issuer-cli fix-not-whitelisted        whitelist all did's that were approved
                                        but not whitelisted      [aliases: fnwl]

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```


## Cron CLI

```
./bin/cron --help
cron <command>

Commands:
  cron fix-whitelist-job [period]  Based on cron period, fix not whitelisted
                                   dids  periodically (defulat 5 mins)
                                                                   [aliases: wj]

Positionals:
  period  period for the task in cron notation with optional seconds
                                               [string] [default: "*/5 * * * *"]


  ```
