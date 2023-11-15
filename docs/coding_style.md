# Coding style

The coding style we follow is based on the Airbnb style with some custom
modifications.

## Linter

The first step of the pipeline will lint the files which checks that the submitted changes comply with repo rules. For `js` and `ts` files it uses the Airbnb coding style with some
modifications.

## Javascript or Typescript?

We are changing the code to TypeScript, so new modules should be coded in that
way.

Why Typescript? Because it is static typed and better able to handle the typical problems associated with large code
bases.

## Public, private and exported functions

To ensure the minifier work as intended we should use the following rules
for names regarding the type of the member. Every member that starts with
an underscore is going to be mangled.

Exported members will appear at the public API level and their name
should be `camelCase`.

Public members can be used between modules but shouldn't be seen outside those modules so their names should be `_camelCase`.

Private members should only be used inside of a module and should be should be `#camelCase` following the new proposed standard (currently on Stage 3 at time of writing).

These naming conventions are not checked by the linter, so please make sure your naming conforms to these standards.

## Why no `continue` support?

The 'continue' command jumps to the next iteration of a loop without executing
the rest of the loop. While in certain specific circumstances 'continue'
can be useful, it is generally considered better practice to omit write loops without 'continue' as it can reduce
readibility and redirect code execution in unexpected ways.

## Disabling the linter

The linter will check for errors by default but it can be disabled if the resulting fix makes the code overly complex or less readable,
or if the linter is incorrectly reporting a failure - for instance if the global variable is defined in another file but linter does not see it, 
the linter can be disabled where the global variable is accessed by adding // eslint-disable-line at the errored line.
