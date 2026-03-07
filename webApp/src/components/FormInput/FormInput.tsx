import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = {
  label: string;
  multiline?: false;
} & InputHTMLAttributes<HTMLInputElement>;

type TextAreaProps = {
  label: string;
  multiline: true;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

type Props = InputProps | TextAreaProps;

export function FormInput(props: Props) {
  if (props.multiline) {
    const { label, multiline: _multiline, ...rest } = props;
    return (
      <label className="field">
        <span>{label}</span>
        <textarea {...rest} />
      </label>
    );
  }

  const { label, multiline: _multiline, ...rest } = props;
  return (
    <label className="field">
      <span>{label}</span>
      <input {...rest} />
    </label>
  );
}
