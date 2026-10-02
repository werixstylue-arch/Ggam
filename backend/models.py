from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from decimal import Decimal, InvalidOperation


class Player(BaseModel):
    id: str
    name: str
    wallet: Optional[str] = None
    x: float = 32768
    y: float = 32808
    world_id: str = 'kingdom'
    discovered: list[str] = Field(default_factory=list)


class GuestResponse(BaseModel):
    token: str
    player: Player


class ProfilePatch(BaseModel):
    name: str = Field(min_length=2, max_length=20, pattern=r'^[\w .-]+$')


class Position(BaseModel):
    x: float = Field(ge=-100000000, le=100000000, allow_inf_nan=False)
    y: float = Field(ge=-100000000, le=100000000, allow_inf_nan=False)


class TokenMetadata(BaseModel):
    contract: str
    name: str
    symbol: str
    logo: str = ''
    description: str = ''
    website: str = ''
    twitter: str = ''
    chain: str = 'Solana'
    existing_world: Optional[str] = None


class World(BaseModel):
    id: str
    contract: str
    name: str
    symbol: str
    logo: str = ''
    description: str = ''
    website: str = ''
    twitter: str = ''
    chain: str = 'Solana'
    min_holding: str = '0'
    gated_actions: list[str] = Field(default_factory=list)
    citizens: int = 0
    points: int = 0
    level: int = 1
    progress: int = 0
    region: int = 0
    owner_id: str = 'kingcom'
    center_x: float = 32768
    center_y: float = 32768
    style: str = 'urban'
    created_at: str
    updated_at: str


class GateConfig(BaseModel):
    min_holding: str = '0'
    gated_actions: list[Literal['enter', 'contribute']] = Field(default_factory=lambda: ['enter', 'contribute'])

    @field_validator('min_holding')
    @classmethod
    def valid_holding(cls, value):
        try:
            d = Decimal(value)
            if not d.is_finite() or d < 0 or d > Decimal('1e20') or d.as_tuple().exponent < -9:
                raise ValueError()
            return format(d, 'f')
        except (InvalidOperation, ValueError):
            raise ValueError('Enter a positive amount with up to 9 decimal places.')


class WorldCreate(GateConfig):
    contract: str = Field(min_length=32, max_length=44)
    plot_x: Optional[int] = Field(default=None, ge=0, le=65536)
    plot_y: Optional[int] = Field(default=None, ge=0, le=65536)