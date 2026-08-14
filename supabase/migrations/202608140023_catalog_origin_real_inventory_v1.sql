-- V37 correction: current business catalog is real inventory/tour content per owner instruction.
update public.vehicles
set record_origin = 'REAL',
    actual_vehicle_verified = true,
    data_quality_status = case
      when data_quality_status = 'UNVERIFIED' then 'BUSINESS_VERIFIED'
      else data_quality_status
    end;

update public.tours
set record_origin = 'REAL',
    data_quality_status = case
      when data_quality_status = 'UNVERIFIED' then 'BUSINESS_VERIFIED'
      else data_quality_status
    end;
