sample and detector notes, not cleaned up

sample coarse stage is KOHZU hardware in the old sheet:

- BL10:SAM:CX / Sample (KOHZU) / mm / init 0 / range -34 to 34 / ioc HW
- BL10:SAM:CY / Sample (KOHZU) / mm / init 0 / range -34 to 34 / ioc HW
- BL10:SAM:CZ / Sample (KOHZU) / mm / init 0 / range -9.5 to 9.5 / ioc HW

other sample axes:

BL10:SAM:Theta, Sample, deg, init=0, range=-180..180, velocity=200, sim
BL10:SAM:Phi, Sample, deg, init=0, range=-5..5, velocity=2, sim

PI fine:
BL10:SAM:FX um 0 -150..150 vel 50 sim
BL10:SAM:FY um 0 -150..150 vel 50 sim
BL10:SAM:FZ um 0 -150..150 vel 50 sim

PI scan:
BL10:SAM:SX um 0 -50..50 vel 100 sim
BL10:SAM:SY um 0 -50..50 vel 100 sim

detector:

| pv | egu | init | range | velocity | ioc |
|---|---|---:|---|---:|---|
| BL10:DET:X | mm | 0 | -50 to 50 | 1 | sim |
| BL10:DET:Y | mm | 0 | -50 to 50 | 1 | sim |
| BL10:DET:Z | mm | 0 | 0 to 5000 | 5 | sim |

