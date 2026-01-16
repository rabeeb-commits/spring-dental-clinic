import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormFieldProps<T extends FieldValues> extends Omit<TextFieldProps, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  helperText?: string;
}

const FormField = <T extends FieldValues>({
  name,
  control,
  label,
  helperText,
  ...props
}: FormFieldProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...props}
          label={label}
          fullWidth
          error={!!error}
          helperText={error?.message || helperText}
          sx={{
            '& .MuiFormHelperText-root': {
              marginLeft: 0,
            },
            ...props.sx,
          }}
        />
      )}
    />
  );
};

export default FormField;
