import { useState } from 'react';
import { useCodeBlockCombobox, useCodeBlockComboboxState } from '@udecode/plate-code-block';

import { cn } from '../../lib/utils';
import { Icons } from '../../components/icons';

import { Button } from './button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const languages: { label: string; value: string }[] = [
  { label: 'Plain Text', value: 'text' },
  { label: 'Bash', value: 'bash' },
  { label: 'CSS', value: 'css' },
  { label: 'Git', value: 'git' },
  { label: 'GraphQL', value: 'graphql' },
  { label: 'HTML', value: 'html' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSON', value: 'json' },
  { label: 'JSX', value: 'jsx' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'SQL', value: 'sql' },
  { label: 'SVG', value: 'svg' },
  { label: 'TSX', value: 'tsx' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'WebAssembly', value: 'wasm' },
  { label: 'ANTLR4', value: 'antlr4' },
  { label: 'C', value: 'c' },
  { label: 'CMake', value: 'cmake' },
  { label: 'CoffeeScript', value: 'coffeescript' },
  { label: 'C#', value: 'csharp' },
  { label: 'Dart', value: 'dart' },
  { label: 'Django', value: 'django' },
  { label: 'Docker', value: 'docker' },
  { label: 'EJS', value: 'ejs' },
  { label: 'Erlang', value: 'erlang' },
  { label: 'Go', value: 'go' },
  { label: 'Groovy', value: 'groovy' },
  { label: 'Java', value: 'java' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'LaTeX', value: 'latex' },
  { label: 'Less', value: 'less' },
  { label: 'Lua', value: 'lua' },
  { label: 'Makefile', value: 'makefile' },
  { label: 'Markup', value: 'markup' },
  { label: 'MATLAB', value: 'matlab' },
  { label: 'Mermaid', value: 'mermaid' },
  { label: 'Objective-C', value: 'objectivec' },
  { label: 'Perl', value: 'perl' },
  { label: 'PHP', value: 'php' },
  { label: 'PowerShell', value: 'powershell' },
  { label: '.properties', value: 'properties' },
  { label: 'Protocol Buffers', value: 'protobuf' },
  { label: 'Python', value: 'python' },
  { label: 'R', value: 'r' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Sass (Sass)', value: 'sass' },
  // FIXME: Error with current scala grammar
  { label: 'Scala', value: 'scala' },
  { label: 'Scheme', value: 'scheme' },
  { label: 'Sass (Scss)', value: 'scss' },
  { label: 'Shell', value: 'shell' },
  { label: 'Swift', value: 'swift' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
];

export function CodeBlockCombobox() {
  const state = useCodeBlockComboboxState();
  const { commandItemProps } = useCodeBlockCombobox(state);

  const [open, setOpen] = useState(false);

  if (state.readOnly) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-5 justify-between px-1 text-xs"
          size="xs"
        >
          {state.value
            ? languages.find((language) => language.value === state.value)?.label
            : 'Plain Text'}
          <Icons.chevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>

          <CommandList>
            {languages.map((language) => (
              <CommandItem
                key={language.value}
                value={language.value}
                className="cursor-pointer"
                onSelect={(_value) => {
                  commandItemProps.onSelect(_value);
                  setOpen(false);
                }}
              >
                <Icons.check
                  className={cn(
                    'mr-2 h-5 w-5',
                    state.value === language.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {language.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
