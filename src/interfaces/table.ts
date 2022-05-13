export interface TableColumn {
    schema_name: string;
    table_name: string;
    column_name: string;
    data_type: string;
    ordinal_position: number;
    is_nullable: boolean;
    is_primary_key: boolean;
    default_value: string;
}

export interface Table {
    schema_name: string;
    table_name: string;
    columns: TableColumn[];
}