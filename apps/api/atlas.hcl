data "external_schema" "gorm" {
  program = [
    "go",
    "run",
    "-mod=mod",
    "ariga.io/atlas-provider-gorm",
    "load",
    "--path", "./internal/storage/models",
    "--dialect", "postgres",
  ]
}
env "local" {
  src = data.external_schema.gorm.url
  url = "postgres://postgres:postgres@localhost:5432/logsicle?search_path=public&sslmode=disable"
  dev = "postgres://postgres:postgres@localhost:5432/atlas?search_path=public&sslmode=disable"
  exclude = [
      "schema_migrations"
  ]
  migration {
    dir    = "file://internal/storage/migrations"
    exclude = ["parser_type", "aggregation_temporality", "metric_type", "span_kind", "span_status"]
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
  diff {
    skip {
      drop_table = true
    }
  }
}
