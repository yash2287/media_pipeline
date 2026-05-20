-- Align prompt_templates rows + default with the model the pipeline actually uses.
-- Code-level templates in trigger/lib/prompts/* pin every slot to gpt-image-2;
-- this migration just brings the legacy seed rows + column default into line so
-- the Templates UI no longer shows the obsolete gpt-image-1.5 tag.

update prompt_templates
set model_id = 'gpt-image-2'
where model_id = 'gpt-image-1.5';

alter table prompt_templates
  alter column model_id set default 'gpt-image-2';
