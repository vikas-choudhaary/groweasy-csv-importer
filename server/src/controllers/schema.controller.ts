import { Request, Response } from 'express';

export const getSchemaMetadata = (req: Request, res: Response): void => {
  try {
    // Hardcoded schema metadata representing the target GrowEasy CRM schema
    // Derived from serverSideCrmRecordSchema in crm.schema.ts
    const schema = [
      { field: 'name', type: 'string', required: false, description: 'Full name of the lead', enums: [] },
      { field: 'email', type: 'string', required: false, description: 'Primary email address', enums: [] },
      { field: 'country_code', type: 'string', required: false, description: 'Numeric country code (e.g. 91)', enums: [] },
      { field: 'mobile_without_country_code', type: 'string', required: false, description: 'Mobile number without country code', enums: [] },
      { field: 'company', type: 'string', required: false, description: 'Company name', enums: [] },
      { field: 'city', type: 'string', required: false, description: 'City name', enums: [] },
      { field: 'state', type: 'string', required: false, description: 'State name', enums: [] },
      { field: 'country', type: 'string', required: false, description: 'Country name', enums: [] },
      { field: 'lead_owner', type: 'string', required: false, description: 'Name of the lead owner', enums: [] },
      { field: 'crm_status', type: 'string', required: false, description: 'CRM status of the lead', enums: ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'] },
      { field: 'crm_note', type: 'string', required: false, description: 'Miscellaneous notes, secondary emails, or secondary phones', enums: [] },
      { field: 'data_source', type: 'string', required: false, description: 'Source of the lead data', enums: ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'] },
      { field: 'possession_time', type: 'string', required: false, description: 'Possession time', enums: [] },
      { field: 'description', type: 'string', required: false, description: 'Description', enums: [] },
      { field: 'created_at', type: 'string', required: false, description: 'Valid parsable date string', enums: [] },
    ];
    res.status(200).json({ success: true, data: schema });
  } catch (error) {
    console.error('[Backend] Schema metadata error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve schema metadata' });
  }
};
